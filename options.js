// DOM 요소들 - 안전한 선언
let autoSaveInterval, enableAutoSave, maxSessions, saveFavicon;
let saveWindowInfo, closeCurrentTabs, restoreWindowLayout;
let showSaveNotification, showRestoreNotification;
let exportDataBtn, importDataBtn, clearAllDataBtn, loginBtn;
let saveSettingsBtn, resetSettingsBtn, accountInfo;
let notification, notificationText;
let languageSelector;

// DOM 요소 초기화 함수
function initializeDOMElements() {
    autoSaveInterval = document.getElementById('autoSaveInterval');
    enableAutoSave = document.getElementById('enableAutoSave');
    maxSessions = document.getElementById('maxSessions');
    saveFavicon = document.getElementById('saveFavicon');
    saveWindowInfo = document.getElementById('saveWindowInfo');
    closeCurrentTabs = document.getElementById('closeCurrentTabs');
    restoreWindowLayout = document.getElementById('restoreWindowLayout');
    showSaveNotification = document.getElementById('showSaveNotification');
    showRestoreNotification = document.getElementById('showRestoreNotification');
    exportDataBtn = document.getElementById('exportData');
    importDataBtn = document.getElementById('importData');
    clearAllDataBtn = document.getElementById('clearAllData');
    loginBtn = document.getElementById('loginBtn');
    saveSettingsBtn = document.getElementById('saveSettings');
    resetSettingsBtn = document.getElementById('resetSettings');
    accountInfo = document.getElementById('accountInfo');
    notification = document.getElementById('notification');
    notificationText = document.getElementById('notificationText');
    languageSelector = document.getElementById('languageSelector');
}

// 기본 설정값
const defaultSettings = {
    autoSaveInterval: 5,
    enableAutoSave: false,
    maxSessions: 10,
    saveFavicon: true,
    saveWindowInfo: true,
    closeCurrentTabs: true,
    restoreWindowLayout: false,
    showSaveNotification: true,
    showRestoreNotification: true
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOMElements(); // DOM 요소 초기화
    await initializeLanguageSelector(); // 언어 선택기 초기화
    await loadSettings();
    await loadAccountInfo();
    setupEventListeners();
    
    // GitHub Token 입력란에 포커스
    const tokenInput = document.getElementById('githubToken');
    if (tokenInput) {
        tokenInput.focus();
    }
});

// 언어 선택기 초기화
async function initializeLanguageSelector() {
    try {
        if (languageSelector && typeof i18n !== 'undefined') {
            const selector = i18n.createLanguageSelector();
            languageSelector.appendChild(selector);
        }
    } catch (error) {
        console.error('언어 선택기 초기화 오류:', error);
    }
}

// 설정 로드
async function loadSettings() {
    try {
        // GitHub Token 로드
        const result = await chrome.storage.local.get(['githubToken', 'autoSaveInterval', 'enableAutoSave', 'encryptionKey']);
        
        // 안전한 DOM 요소 찾기 함수
        function safeSetValue(id, value, type = 'value') {
            const element = document.getElementById(id);
            if (element) {
                if (type === 'checked') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        }
        
        if (result.githubToken) {
            safeSetValue('githubToken', result.githubToken);
        }
        
        if (result.autoSaveInterval) {
            safeSetValue('autoSaveInterval', result.autoSaveInterval);
        } else {
            // 기본값 설정
            safeSetValue('autoSaveInterval', 5);
        }
        
        // 자동 저장 설정 - 명시적으로 true인 경우만 활성화, 기본값은 false
        if (result.enableAutoSave !== undefined) {
            safeSetValue('enableAutoSave', result.enableAutoSave, 'checked');
        } else {
            // 설정이 없는 경우 기본적으로 false로 설정
            safeSetValue('enableAutoSave', false, 'checked');
        }
        
        if (result.encryptionKey) {
            safeSetValue('encryptionKey', result.encryptionKey);
        }
        
    } catch (error) {
        console.error('설정 로드 오류:', error);
        showStatus('설정 로드 중 오류가 발생했습니다.', 'error');
    }
}

// 설정 저장
async function saveSettings() {
    // 안전한 DOM 요소 찾기 함수
    function safeGetValue(id, type = 'value') {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
            return type === 'checked' ? false : '';
        }
        return type === 'checked' ? element.checked : element.value;
    }
    
    const autoSaveInterval = parseInt(safeGetValue('autoSaveInterval'));
    const enableAutoSave = safeGetValue('enableAutoSave', 'checked');
    
    if (autoSaveInterval < 1 || autoSaveInterval > 60) {
        showStatus('자동 저장 간격은 1-60분 사이로 설정해주세요.', 'error');
        return;
    }
    
    // 저장 버튼 비활성화 및 텍스트 변경
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
        const originalText = saveSettingsBtn.textContent;
        const originalBackground = saveSettingsBtn.style.backgroundColor;
        
        saveSettingsBtn.disabled = true;
        saveSettingsBtn.textContent = '저장 중...';
        saveSettingsBtn.style.backgroundColor = '#6c757d';
        saveSettingsBtn.style.cursor = 'not-allowed';
        
        try {
            // Chrome Storage Local에 저장
            await chrome.storage.local.set({
                autoSaveInterval: autoSaveInterval,
                enableAutoSave: enableAutoSave
            });
            
            // Background script에 설정 변경 알림
            try {
                chrome.runtime.sendMessage({ action: 'settingsChanged' });
            } catch (error) {
                console.log('Background script 알림 실패:', error);
            }
            
            // 성공 메시지 표시
            showStatusInElement('saveSettingsStatus', i18n.getMessage('settingsSaved'), 'success');
            
            // 설정 저장 후 자동 저장 상태 알림
            setTimeout(() => {
                if (enableAutoSave) {
                    showStatusInElement('saveSettingsStatus', i18n.getMessage('autoSaveEnabledMessage', [autoSaveInterval.toString()]), 'success');
                } else {
                    showStatusInElement('saveSettingsStatus', i18n.getMessage('autoSaveDisabledMessage'), 'success');
                }
            }, 1000);
            
        } catch (error) {
            console.error('설정 저장 오류:', error);
            showStatusInElement('saveSettingsStatus', i18n.getMessage('settingsSaveError'), 'error');
        } finally {
            // 버튼 상태 복원
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.textContent = originalText;
            saveSettingsBtn.style.backgroundColor = originalBackground;
            saveSettingsBtn.style.cursor = 'pointer';
        }
    }
}

// 설정 초기화
async function resetSettings() {
    if (!confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) return;
    
    try {
        await chrome.storage.sync.clear();
        await loadSettings();
        showNotification('설정이 기본값으로 초기화되었습니다', 'success');
    } catch (error) {
        console.error('설정 초기화 오류:', error);
        showNotification('설정 초기화에 실패했습니다', 'error');
    }
}

// GitHub Gist 상태 로드
async function loadAccountInfo() {
    try {
        const githubStatus = document.getElementById('githubStatus');
        const token = await chrome.storage.local.get(['githubToken', 'encryptionKey']);
        
        if (token.githubToken) {
            // GitHub API로 사용자 정보 가져오기
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                const encryptionStatus = token.encryptionKey ? '사용자 정의 키' : 'GitHub Token';
                
                githubStatus.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${user.avatar_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPgo='}" 
                         alt="프로필" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #667eea;">
                        <div style="text-align: left;">
                            <p style="font-weight: 600; margin: 0; color: #333;">${user.name || user.login}</p>
                            <p style="font-size: 12px; margin: 0; color: #666;">${user.email || `${user.login}@github.com`}</p>
                            <p style="font-size: 11px; margin: 0; color: #28a745;">GitHub Gist 연결됨</p>
                            <p style="font-size: 11px; margin: 0; color: #007bff;">암호화: ${encryptionStatus}</p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-bottom: 15px;">
                        <p style="font-size: 12px; color: #666; margin: 0;">이제 탭이 GitHub Gist에 암호화되어 자동으로 저장됩니다</p>
                    </div>
                    <button id="disconnectBtn" class="btn btn-secondary">연결 해제</button>
                `;
                
                // 연결 해제 버튼 이벤트 리스너 추가
                document.getElementById('disconnectBtn').addEventListener('click', handleDisconnect);
            } else {
                githubStatus.innerHTML = `
                    <p style="color: #dc3545;">GitHub Token이 유효하지 않습니다</p>
                    <p style="font-size: 12px; color: #666;">새로운 Token을 생성하여 다시 설정해주세요</p>
                    <button id="disconnectBtn" class="btn btn-secondary">연결 해제</button>
                `;
                document.getElementById('disconnectBtn').addEventListener('click', handleDisconnect);
            }
        } else {
            githubStatus.innerHTML = `
                <p>GitHub Gist 연결이 필요합니다</p>
                <p style="font-size: 12px; color: #666;">아래에서 Personal Access Token을 설정하세요</p>
                <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin: 10px 0;">
                    <p style="font-size: 11px; margin: 0; color: #666;">
                        <strong>Token 없이도 사용 가능:</strong> 로컬 모드로 탭 저장/복원 가능
                    </p>
                    <p style="font-size: 11px; margin: 5px 0 0 0; color: #007bff;">
                        <strong>암호화:</strong> GitHub Gist 사용 시 자동으로 AES 암호화 적용
                    </p>
                </div>
            `;
        }
    } catch (error) {
        console.error('GitHub 상태 로드 오류:', error);
        document.getElementById('githubStatus').innerHTML = `
            <p style="color: #dc3545;">GitHub 상태 확인 중 오류가 발생했습니다</p>
            <p style="font-size: 12px; color: #666;">인터넷 연결을 확인해주세요</p>
        `;
    }
}

// 연결 해제 처리
async function handleDisconnect() {
    try {
        await chrome.storage.local.remove('githubToken');
        await chrome.storage.local.remove('gistIds');
        
        // 연결 해제 후 즉시 상태 새로고침
        await loadAccountInfo();
        
        showNotification('GitHub Gist 연결이 해제되었습니다', 'success');
    } catch (error) {
        console.error('연결 해제 오류:', error);
        showNotification('연결 해제 중 오류가 발생했습니다', 'error');
    }
}

// 데이터 내보내기
async function exportData() {
    try {
        const data = await chrome.storage.local.get();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tab-saver-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('데이터가 내보내기되었습니다', 'success');
    } catch (error) {
        console.error('데이터 내보내기 오류:', error);
        showNotification('데이터 내보내기에 실패했습니다', 'error');
    }
}

// 데이터 가져오기
async function importData() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await chrome.storage.local.clear();
                    await chrome.storage.local.set(data);
                    
                    showNotification('데이터가 성공적으로 가져와졌습니다', 'success');
                } catch (error) {
                    console.error('데이터 파싱 오류:', error);
                    showNotification('잘못된 파일 형식입니다', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    } catch (error) {
        console.error('데이터 가져오기 오류:', error);
        showNotification('데이터 가져오기에 실패했습니다', 'error');
    }
}

// 모든 데이터 삭제
async function clearAllData() {
    if (!confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        showNotification('모든 데이터가 삭제되었습니다', 'success');
    } catch (error) {
        console.error('데이터 삭제 오류:', error);
        showNotification('데이터 삭제에 실패했습니다', 'error');
    }
}

// 알림 메시지 표시
function showNotification(message, type = 'success') {
    if (notificationText) {
        notificationText.textContent = message;
    }
    if (notification) {
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 안전한 DOM 요소 찾기 함수
    function safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
            return null;
        }
        return element;
    }

    // GitHub Token 저장
    const saveTokenBtn = safeGetElement('saveToken');
    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', saveGitHubToken);
    }
    
    // GitHub Token 테스트
    const testTokenBtn = safeGetElement('testToken');
    if (testTokenBtn) {
        testTokenBtn.addEventListener('click', testGitHubToken);
    }
    
    // 암호화 키 저장/재설정
    const saveEncryptionKeyBtn = safeGetElement('saveEncryptionKey');
    if (saveEncryptionKeyBtn) {
        saveEncryptionKeyBtn.addEventListener('click', saveEncryptionKey);
    }
    
    const resetEncryptionKeyBtn = safeGetElement('resetEncryptionKey');
    if (resetEncryptionKeyBtn) {
        resetEncryptionKeyBtn.addEventListener('click', resetEncryptionKey);
    }
    
    // 일반 설정 저장
    const saveSettingsBtn = safeGetElement('saveSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }
    
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportData);
    }
    
    if (importDataBtn) {
        importDataBtn.addEventListener('click', importData);
    }
    
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', clearAllData);
    }
    
    // 설정 변경 시 자동 저장 (선택사항)
    const autoSaveElements = [
        autoSaveInterval, enableAutoSave, maxSessions, saveFavicon,
        saveWindowInfo, closeCurrentTabs, restoreWindowLayout,
        showSaveNotification, showRestoreNotification
    ].filter(element => element !== null); // null 요소 제거
    
    autoSaveElements.forEach(element => {
        if (element) {
            element.addEventListener('change', () => {
                // 자동 저장을 원한다면 여기서 saveSettings() 호출
                // showNotification('설정이 자동으로 저장되었습니다', 'success');
            });
        }
    });
}

// GitHub Token 저장
async function saveGitHubToken() {
    const token = document.getElementById('githubToken').value.trim();
    
    if (!token) {
        showStatusInElement('githubTokenStatus', i18n.getMessage('enterGitHubToken'), 'error');
        return;
    }
    
    if (!token.startsWith('ghp_')) {
        showStatusInElement('githubTokenStatus', i18n.getMessage('invalidGitHubTokenFormat'), 'error');
        return;
    }
    
    try {
        await chrome.storage.local.set({ githubToken: token });
        showStatusInElement('githubTokenStatus', i18n.getMessage('githubTokenSaved'), 'success');
        
        // 토큰 저장 후 GitHub 상태 새로고침
        setTimeout(async () => {
            await loadAccountInfo();
        }, 500);
        
    } catch (error) {
        console.error('Token 저장 오류:', error);
        showStatusInElement('githubTokenStatus', i18n.getMessage('githubTokenSaveError'), 'error');
    }
}

// GitHub Token 테스트
async function testGitHubToken() {
    const token = document.getElementById('githubToken').value.trim();
    
    if (!token) {
        showStatusInElement('githubTokenStatus', i18n.getMessage('enterGitHubToken'), 'error');
        return;
    }
    
    showStatusInElement('githubTokenStatus', i18n.getMessage('testingGitHubConnection'), 'warning');
    
    try {
        // GitHub API로 사용자 정보 가져오기
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            const userName = user.name || i18n.getMessage('noName');
            showStatusInElement('githubTokenStatus', i18n.getMessage('githubConnectionSuccess', [user.login, userName]), 'success');
            
            // 연결 성공 시 토큰 저장 및 상태 새로고침
            await chrome.storage.local.set({ githubToken: token });
            setTimeout(async () => {
                await loadAccountInfo();
            }, 500);
            
        } else if (response.status === 401) {
            showStatusInElement('githubTokenStatus', i18n.getMessage('githubTokenInvalid'), 'error');
        } else {
            showStatusInElement('githubTokenStatus', i18n.getMessage('githubConnectionFailed', [response.status.toString(), response.statusText]), 'error');
        }
    } catch (error) {
        console.error('GitHub 연결 테스트 오류:', error);
        showStatusInElement('githubTokenStatus', i18n.getMessage('githubConnectionTestError'), 'error');
    }
}

// 상태 메시지 표시
function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    if (!statusElement) {
        console.error('status 요소를 찾을 수 없습니다');
        return;
    }
    
    // 기존 클래스 제거
    statusElement.className = 'status';
    
    // 메시지 설정
    statusElement.textContent = message;
    
    // 타입에 따른 클래스 추가
    if (type) {
        statusElement.classList.add(type);
    }
    
    // 표시
    statusElement.style.display = 'block';
    
    // 5초 후 자동 숨김
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// 암호화 키 저장
async function saveEncryptionKey() {
    const encryptionKey = document.getElementById('encryptionKey').value.trim();
    
    if (!encryptionKey) {
        showStatusInElement('encryptionKeyStatus', i18n.getMessage('enterEncryptionKey'), 'error');
        return;
    }
    
    if (encryptionKey.length < 8) {
        showStatusInElement('encryptionKeyStatus', i18n.getMessage('encryptionKeyTooShort'), 'error');
        return;
    }
    
    try {
        await chrome.storage.local.set({ encryptionKey: encryptionKey });
        showStatusInElement('encryptionKeyStatus', i18n.getMessage('encryptionKeySaved'), 'success');
        
        // 암호화 키 저장 후 GitHub 상태 새로고침
        setTimeout(async () => {
            await loadAccountInfo();
        }, 500);
        
    } catch (error) {
        console.error('암호화 키 저장 오류:', error);
        showStatusInElement('encryptionKeyStatus', i18n.getMessage('encryptionKeySaveError'), 'error');
    }
}

// 암호화 키 재설정
async function resetEncryptionKey() {
    if (!confirm(i18n.getMessage('confirmResetEncryptionKey'))) {
        return;
    }
    
    try {
        await chrome.storage.local.remove('encryptionKey');
        document.getElementById('encryptionKey').value = '';
        
        showStatusInElement('encryptionKeyStatus', i18n.getMessage('encryptionKeyReset'), 'success');
        
        // 재설정 후 GitHub 상태 새로고침
        setTimeout(async () => {
            await loadAccountInfo();
        }, 500);
        
    } catch (error) {
        console.error('암호화 키 재설정 오류:', error);
        showStatusInElement('encryptionKeyStatus', i18n.getMessage('encryptionKeyResetError'), 'error');
    }
}

// 상태 메시지 표시 (요소에 표시)
function showStatusInElement(elementId, message, type) {
    const statusElement = document.getElementById(elementId);
    if (!statusElement) {
        console.error(`Element with id '${elementId}' not found`);
        return;
    }
    
    // 기존 클래스 제거
    statusElement.className = 'status';
    
    // 메시지 설정
    statusElement.textContent = message;
    
    // 타입에 따른 클래스 추가
    if (type) {
        statusElement.classList.add(type);
    }
    
    // 표시
    statusElement.style.display = 'block';
    
    // 5초 후 자동 숨김
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
} 