// DOM 요소들
const googleLoginBtn = document.getElementById('googleLoginBtn');
const skipLoginBtn = document.getElementById('skipLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const syncSettingsBtn = document.getElementById('syncSettingsBtn');
const saveNowBtn = document.getElementById('saveNowBtn');
const notLoggedIn = document.getElementById('notLoggedIn');
const loggedIn = document.getElementById('loggedIn');
const mainFeatures = document.getElementById('mainFeatures');
const loadingSpinner = document.getElementById('loadingSpinner');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

// 언어 선택기 요소
const languageSelector = document.getElementById('languageSelector');

// 세션 상세 보기 요소들
const sessionsList = document.getElementById('sessionsList');
const sessionDetail = document.getElementById('sessionDetail');
const backToListBtn = document.getElementById('backToList');
const detailTitle = document.getElementById('detailTitle');
const detailTime = document.getElementById('detailTime');
const detailTabCount = document.getElementById('detailTabCount');
const detailWindowCount = document.getElementById('detailWindowCount');
const windowTabsList = document.getElementById('windowTabsList');
const filterInput = document.getElementById('filterInput');
const restoreSelectedBtn = document.getElementById('restoreSelected');
const restoreSessionBtn = document.getElementById('restoreSession');
const deleteSessionBtn = document.getElementById('deleteSession');

// 여러 세션 선택 관련 요소들
const selectAllBtn = document.getElementById('selectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');

// 사용자 정보 요소들
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const syncStatus = document.getElementById('syncStatus');

// 상태 정보 요소들
const currentTabCount = document.getElementById('currentTabCount');
const currentWindowCount = document.getElementById('currentWindowCount');
const lastSaved = document.getElementById('lastSaved');

// 현재 사용자 정보
let currentUser = null;
let currentSession = null;

// 여러 세션 선택 관련 상태
let selectedSessions = new Set();
let allSessions = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // i18n 객체가 준비될 때까지 대기
        let retryCount = 0;
        while (typeof i18n === 'undefined' && retryCount < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retryCount++;
        }
        
        if (typeof i18n === 'undefined') {
            console.error('i18n 객체를 찾을 수 없습니다');
            return;
        }
        
        // i18n 객체가 완전히 초기화될 때까지 추가 대기
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await initializePopup();
        
    } catch (error) {
        console.error('팝업 초기화 중 오류:', error);
    }
});

// i18n 초기화 완료 이벤트 리스너
window.addEventListener('i18nReady', async (event) => {
    try {
        // 이미 초기화되었는지 확인
        if (document.getElementById('statusText')?.textContent === i18n.getMessage('checking')) {
            await initializePopup();
        }
    } catch (error) {
        console.error('i18nReady 이벤트 처리 오류:', error);
    }
});

// 언어 변경 이벤트 리스너
window.addEventListener('languageChanged', async (event) => {
    try {
        // 언어 변경 후 상태 다시 업데이트
        await updateSimpleStatus();
        await loadCurrentTabInfo();
        await loadSavedSessions();
    } catch (error) {
        console.error('언어 변경 후 상태 업데이트 오류:', error);
    }
});

// 팝업 초기화
async function initializePopup() {
    try {
        // i18n 객체가 준비되지 않은 경우 재시도
        if (typeof i18n === 'undefined') {
            console.log('i18n 객체가 준비되지 않음, 100ms 후 재시도');
            setTimeout(initializePopup, 100);
            return;
        }
        
        // 언어 선택기 초기화
        await initializeLanguageSelector();
        
        // 간단한 상태 확인
        await updateSimpleStatus();
        
        // 현재 탭 정보 로드
        await loadCurrentTabInfo();
        
        // 저장된 세션 로드
        await loadSavedSessions();
        
        // 자동 저장 상태 확인
        await checkAutoSaveStatus();
        
    } catch (error) {
        console.error('팝업 초기화 오류:', error);
        showNotification(i18n.getMessage('initializationError'), 'error');
        
        // 오류 발생 시에도 기본 상태는 표시
        try {
            await updateSimpleStatus();
        } catch (fallbackError) {
            console.error('폴백 상태 업데이트 오류:', fallbackError);
        }
    }
}

// 언어 선택기 초기화
async function initializeLanguageSelector() {
    try {
        if (languageSelector && typeof i18n !== 'undefined') {
            // 기존 내용 제거
            languageSelector.innerHTML = '';
            // 새로운 언어 선택기 생성
            const selector = i18n.createLanguageSelector();
            languageSelector.appendChild(selector);
        }
    } catch (error) {
        console.error('언어 선택기 초기화 오류:', error);
    }
}

// 자동 저장 상태 확인
async function checkAutoSaveStatus() {
    try {
        const settings = await chrome.storage.local.get(['enableAutoSave', 'autoSaveInterval']);
        // 기본값을 false로 설정 (사용자가 명시적으로 활성화해야 함)
        const isEnabled = settings.enableAutoSave === true; // 명시적으로 true인 경우만 활성화
        const interval = settings.autoSaveInterval || 5;
        
        // 자동 저장 강제 재시작
        await chrome.runtime.sendMessage({ action: 'settingsChanged' });
        
        if (isEnabled) {
            showNotification(i18n.getMessage('autoSaveEnabled', [interval.toString()]), 'success');
        } else {
            // 자동 저장이 비활성화된 경우 정보 메시지 표시
            showNotification(i18n.getMessage('autoSaveDisabled') + '. ' + i18n.getMessage('autoSaveSettings'), 'info');
        }
        
        return { isEnabled, interval };
    } catch (error) {
        console.error('자동 저장 상태 확인 오류:', error);
        showNotification(i18n.getMessage('autoSaveCheckError'), 'error');
        return { isEnabled: false, interval: 5 };
    }
}

// 간단한 상태 업데이트
async function updateSimpleStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!statusIcon || !statusText || !settingsBtn || !logoutBtn) {
        console.error('상태 업데이트 요소를 찾을 수 없습니다');
        return;
    }
    
    // i18n 객체가 준비되지 않은 경우 대기
    if (typeof i18n === 'undefined') {
        console.log('i18n 객체가 준비되지 않음, 상태 업데이트 대기');
        return;
    }
    
    // 초기 상태 설정
    statusIcon.textContent = '●';
    statusIcon.style.color = '#6b7280';
    statusText.textContent = i18n.getMessage('checking');
    settingsBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    
    try {
        const token = await chrome.storage.local.get(['githubToken', 'encryptionKey']);
        
        if (token.githubToken) {
            try {
                // GitHub API로 사용자 정보 가져오기
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${token.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    const encryptionStatus = token.encryptionKey ? i18n.getMessage('customKey') : 'GitHub Token';
                    statusIcon.textContent = '●';
                    statusIcon.style.color = '#10b981';
                    statusText.textContent = `${user.name || user.login} (${encryptionStatus})`;
                    settingsBtn.style.display = 'inline-block';
                    settingsBtn.textContent = i18n.getMessage('settings');
                    logoutBtn.style.display = 'inline-block';
                    logoutBtn.textContent = i18n.getMessage('logout');
                } else {
                    statusIcon.textContent = '●';
                    statusIcon.style.color = '#f59e0b';
                    statusText.textContent = i18n.getMessage('tokenError');
                    settingsBtn.style.display = 'inline-block';
                    settingsBtn.textContent = i18n.getMessage('reconfigure');
                    logoutBtn.style.display = 'none';
                }
            } catch (fetchError) {
                // 네트워크 오류 시에도 로컬 모드로 표시
                statusIcon.textContent = '●';
                statusIcon.style.color = '#6b7280';
                statusText.textContent = i18n.getMessage('localMode');
                settingsBtn.style.display = 'inline-block';
                settingsBtn.textContent = i18n.getMessage('githubSetup');
                logoutBtn.style.display = 'none';
            }
        } else {
            statusIcon.textContent = '●';
            statusIcon.style.color = '#6b7280';
            statusText.textContent = i18n.getMessage('localMode');
            settingsBtn.style.display = 'inline-block';
            settingsBtn.textContent = i18n.getMessage('githubSetup');
            logoutBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('상태 업데이트 오류:', error);
        // 오류 발생 시에도 명확한 상태 표시
        statusIcon.textContent = '●';
        statusIcon.style.color = '#ef4444';
        statusText.textContent = i18n.getMessage('connectionError');
        settingsBtn.style.display = 'inline-block';
        settingsBtn.textContent = i18n.getMessage('settings');
        logoutBtn.style.display = 'none';
    }
}

// 구글 계정 정보 가져오기 (Chrome Identity API 사용)
async function getGitHubGistUserInfo() {
    try {
        // GitHub Token 가져오기
        const token = await chrome.storage.local.get('githubToken');
        
        if (!token.githubToken) {
            return {
                displayName: i18n.getMessage('localUser'),
                email: i18n.getMessage('localMode'),
                photoURL: null
            };
        }
        
        // GitHub API로 사용자 정보 가져오기
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            return {
                displayName: user.name || user.login,
                email: user.email || `${user.login}@github.com`,
                photoURL: user.avatar_url
            };
        } else {
            return {
                displayName: i18n.getMessage('githubGistUser'),
                email: i18n.getMessage('syncEnabled'),
                photoURL: null
            };
        }
    } catch (error) {
        console.error('사용자 정보 가져오기 오류:', error);
        return {
            displayName: i18n.getMessage('githubGistUser'),
            email: i18n.getMessage('syncEnabled'),
            photoURL: null
        };
    }
}

// 구글 로그인 상태 확인 (OAuth 오류 방지)
async function checkGoogleLoginStatus() {
    try {
        // 간단한 방법으로 구글 로그인 확인
        // Chrome Identity API는 OAuth 설정이 필요하므로 우회
        const syncEnabled = await checkSyncEnabled();
        
        if (syncEnabled) {
            return {
                isLoggedIn: true,
                user: {
                    id: 'google-user',
                    name: '구글 사용자',
                    email: 'google@user.com',
                    picture: null
                }
            };
        } else {
            return { isLoggedIn: false };
        }
    } catch (error) {
        console.error('구글 로그인 상태 확인 오류:', error);
        return { isLoggedIn: false };
    }
}

// 사용자 정보 가져오기 (OAuth 오류 방지)
async function getUserInfo(token) {
    try {
        // OAuth 설정이 필요하므로 기본 정보만 반환
        return {
            id: 'google-user',
            name: '구글 사용자',
            email: 'google@user.com',
            picture: null
        };
    } catch (error) {
        console.error('사용자 정보 가져오기 오류:', error);
        return null;
    }
}

// Chrome Sync 활성화 상태 확인
async function checkSyncEnabled() {
    try {
        // 실제로 데이터를 저장해보기
        await chrome.storage.sync.set({ testSync: Date.now() });
        await chrome.storage.sync.remove('testSync');
        return true; // 접근 가능하면 동기화 활성화
    } catch (error) {
        console.error('Chrome Sync 접근 불가:', error);
        return false; // 접근 불가능하면 동기화 비활성화
    }
}

// 동기화 상태 업데이트
async function updateSyncStatus() {
    try {
        const token = await chrome.storage.local.get('githubToken');
        
        if (token.githubToken) {
            syncStatus.textContent = i18n.getMessage('githubGistSync');
            syncStatus.className = 'sync-badge';
        } else {
            syncStatus.textContent = i18n.getMessage('localMode');
            syncStatus.className = 'sync-badge warning';
        }
    } catch (error) {
        syncStatus.textContent = i18n.getMessage('syncStatusUnavailable');
        syncStatus.className = 'sync-badge error';
    }
}

// 로그인 상태 표시
function showLoggedInState() {
    notLoggedIn.style.display = 'none';
    loggedIn.style.display = 'flex';
    mainFeatures.style.display = 'block';
    
    // 사용자 정보 표시
    if (currentUser.photoURL) {
        userPhoto.src = currentUser.photoURL;
    } else {
        userPhoto.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPgo=';
    }
    
    if (currentUser.isGitHubGistUser) {
        userName.textContent = currentUser.displayName || i18n.getMessage('githubGistUser');
        userEmail.textContent = currentUser.email || i18n.getMessage('syncEnabled');
    } else if (currentUser.isLocalUser) {
        userName.textContent = i18n.getMessage('localUser');
        userEmail.textContent = i18n.getMessage('localMode');
    } else {
        userName.textContent = currentUser.displayName || '사용자';
        userEmail.textContent = currentUser.email || '';
    }
}

// 로그아웃 상태 표시
function showLoggedOutState() {
    notLoggedIn.style.display = 'block';
    loggedIn.style.display = 'none';
    mainFeatures.style.display = 'none';
}

// 구글 로그인 (간단한 방식)
async function handleGoogleLogin() {
    try {
        showLoading(true);
        
        // 옵션 페이지 열기 (GitHub Gist 설정)
        chrome.runtime.openOptionsPage();
        
        showNotification(i18n.getMessage('settingsPageOpened'), 'success');
        
        // 잠시 후 상태 다시 확인
        setTimeout(async () => {
            await initializePopup();
        }, 2000);
    } catch (error) {
        console.error('옵션 페이지 열기 오류:', error);
        showNotification(i18n.getMessage('settingsPageError'), 'error');
    } finally {
        showLoading(false);
    }
}

// 로그인 건너뛰기
async function handleSkipLogin() {
    try {
        // 로컬 모드로 사용
        currentUser = {
            uid: 'local-user',
            displayName: i18n.getMessage('localUser'),
            email: 'local@tab-saver.com',
            photoURL: null
        };
        
        showLoggedInState();
        await loadCurrentTabInfo();
        await loadSavedSessions();
        
        showNotification(i18n.getMessage('localModeMessage'), 'warning');
    } catch (error) {
        console.error('로컬 모드 전환 오류:', error);
    }
}

// 로그아웃
async function handleLogout() {
    try {
        showLoading(true);
        
        // GitHub Token 삭제
        await chrome.storage.local.remove('githubToken');
        await chrome.storage.local.remove('gistIds');
        
        // 로컬 사용자 정보로 변경
        currentUser = {
            uid: 'local-user',
            displayName: i18n.getMessage('localUser'),
            email: i18n.getMessage('localMode'),
            photoURL: null,
            isLocalUser: true
        };
        
        // 즉시 UI 업데이트
        await updateSimpleStatus();
        await loadCurrentTabInfo();
        await loadSavedSessions();
        
        showNotification(i18n.getMessage('githubDisconnected'), 'success');
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showNotification(i18n.getMessage('logoutError'), 'error');
        
        // 오류가 발생해도 강제로 로컬 모드로 전환
        try {
            await updateSimpleStatus();
            await loadCurrentTabInfo();
            await loadSavedSessions();
        } catch (fallbackError) {
            console.error('폴백 UI 업데이트 오류:', fallbackError);
        }
    } finally {
        showLoading(false);
    }
}

// 동기화 설정 열기
function openSyncSettings() {
    chrome.runtime.openOptionsPage();
    showNotification(i18n.getMessage('settingsPageOpened'), 'success');
}

// 현재 탭 정보 로드
async function loadCurrentTabInfo() {
    try {
        const tabs = await chrome.tabs.query({});
        const windows = await chrome.windows.getAll();
        
        currentTabCount.textContent = tabs.length;
        currentWindowCount.textContent = windows.length;
        
        // 마지막 저장 시간 표시
        const lastSavedTime = await chrome.storage.local.get('lastSaved');
        if (lastSavedTime.lastSaved) {
            const date = new Date(lastSavedTime.lastSaved);
            lastSaved.textContent = date.toLocaleString(this.currentLocale === 'ko' ? 'ko-KR' : 'en-US');
        } else {
            lastSaved.textContent = i18n.getMessage('none');
        }
    } catch (error) {
        console.error('탭 정보 로드 오류:', error);
    }
}

// 저장된 세션 목록 로드
async function loadSavedSessions() {
    try {
        showLoading(true);
        
        const sessions = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getSessions' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('메시지 오류:', chrome.runtime.lastError);
                    resolve([]);
                } else {
                    resolve(response || []);
                }
            });
        });
        
        displaySessions(sessions);
    } catch (error) {
        console.error('세션 목록 로드 오류:', error);
        sessionsList.innerHTML = '<p class="error">세션 목록을 불러올 수 없습니다</p>';
    } finally {
        showLoading(false);
    }
}

// 세션 목록 표시
function displaySessions(sessions) {
    allSessions = sessions; // 전역 변수에 저장
    
    if (sessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="empty-state">
                <p>${i18n.getMessage('noSavedSessions')}</p>
                <p>${i18n.getMessage('saveTabsPrompt')}</p>
            </div>
        `;
        return;
    }
    
    const sessionsHTML = sessions.map(session => {
        const date = new Date(session.createdAt);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="session-item selectable" data-session-id="${session.id}">
                <div class="session-header">
                    <input type="checkbox" class="session-checkbox" data-session-id="${session.id}">
                    <span class="session-title">${session.tabCount}개 탭 (${session.windowCount}개 창)</span>
                </div>
                <div class="session-details">
                    <span>${date.toLocaleString(this.currentLocale === 'ko' ? 'ko-KR' : 'en-US')}</span>
                </div>
                <div class="session-footer">
                    <span class="session-time">${timeAgo}</span>
                    <div class="session-actions">
                        <button class="btn btn-primary btn-small view-detail-btn" data-session-id="${session.id}">
                            상세보기
                        </button>
                        <button class="btn btn-success btn-small restore-btn" data-session-id="${session.id}">
                            ${i18n.getMessage('restore')}
                        </button>
                        <button class="btn btn-danger btn-small delete-btn" data-session-id="${session.id}">
                            ${i18n.getMessage('delete')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    sessionsList.innerHTML = sessionsHTML;
    
    // 이벤트 리스너 추가
    addSessionEventListeners();
    addSessionSelectionEventListeners();
}

// 세션 이벤트 리스너 추가
function addSessionEventListeners() {
    // 상세보기 버튼 이벤트
    const viewDetailButtons = sessionsList.querySelectorAll('.view-detail-btn');
    viewDetailButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const sessionId = button.getAttribute('data-session-id');
            await showSessionDetail(sessionId);
        });
    });
    
    // 복원 버튼 이벤트
    const restoreButtons = sessionsList.querySelectorAll('.restore-btn');
    restoreButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const sessionId = button.getAttribute('data-session-id');
            await restoreSession(sessionId);
        });
    });
    
    // 삭제 버튼 이벤트
    const deleteButtons = sessionsList.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const sessionId = button.getAttribute('data-session-id');
            await deleteSession(sessionId);
        });
    });
}

// 시간 전 표시
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return i18n.getMessage('justNow');
    if (diffInSeconds < 3600) return i18n.getMessage('minutesAgo', [Math.floor(diffInSeconds / 60).toString()]);
    if (diffInSeconds < 86400) return i18n.getMessage('hoursAgo', [Math.floor(diffInSeconds / 3600).toString()]);
    return i18n.getMessage('daysAgo', [Math.floor(diffInSeconds / 86400).toString()]);
}

// 세션 복원
async function restoreSession(sessionId) {
    try {
        showLoading(true);
        
        const success = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: 'restoreSession', 
                sessionId: sessionId 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('메시지 오류:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    resolve(response);
                }
            });
        });
        
        if (success) {
            showNotification(i18n.getMessage('sessionRestored'), 'success');
            window.close();
        } else {
            showNotification(i18n.getMessage('sessionRestoreError'), 'error');
        }
    } catch (error) {
        console.error('세션 복원 오류:', error);
        showNotification(i18n.getMessage('sessionRestoreError'), 'error');
    } finally {
        showLoading(false);
    }
}

// 세션 삭제
async function deleteSession(sessionId) {
    if (!confirm(i18n.getMessage('confirmDeleteAll'))) return;
    
    try {
        showLoading(true);
        
        const success = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: 'deleteSession', 
                sessionId: sessionId 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('메시지 오류:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    resolve(response);
                }
            });
        });
        
        if (success) {
            showNotification(i18n.getMessage('sessionDeleted'), 'success');
            await loadSavedSessions();
        } else {
            showNotification(i18n.getMessage('sessionDeleteError'), 'error');
        }
    } catch (error) {
        console.error('세션 삭제 오류:', error);
        showNotification(i18n.getMessage('sessionDeleteError'), 'error');
    } finally {
        showLoading(false);
    }
}

// 로딩 상태 표시/숨김
function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

// 알림 메시지 표시
function showNotification(message, type = 'success') {
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 세션 상세 보기
async function showSessionDetail(sessionId) {
    try {
        showLoading(true);
        
        const sessions = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getSessions' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('메시지 오류:', chrome.runtime.lastError);
                    resolve([]);
                } else {
                    resolve(response || []);
                }
            });
        });
        
        const session = sessions.find(s => s.id === sessionId);
        if (!session) {
            showNotification(i18n.getMessage('sessionRestoreError'), 'error');
            return;
        }
        currentSession = session;
        
        // 세션 상세 보기 표시 (팝업 내 하단에 나타나는 형태)
        const sessionDetailEl = document.getElementById('sessionDetail');
        if (sessionDetailEl) {
            // 내용 채우기
            const date = new Date(session.createdAt);
            const detailTitleEl = document.getElementById('detailTitle');
            const detailTimeEl = document.getElementById('detailTime');
            const detailTabCountEl = document.getElementById('detailTabCount');
            const detailWindowCountEl = document.getElementById('detailWindowCount');
            if (detailTitleEl) detailTitleEl.textContent = `${session.tabCount || 0}${i18n.getMessage('totalTabs')} (${session.windowCount || 0}${i18n.getMessage('totalWindows')})`;
            if (detailTimeEl) detailTimeEl.textContent = date.toLocaleString(this.currentLocale === 'ko' ? 'ko-KR' : 'en-US');
            if (detailTabCountEl) detailTabCountEl.textContent = session.tabCount || 0;
            if (detailWindowCountEl) detailWindowCountEl.textContent = session.windowCount || 0;
            displayWindowTabs(session);
            sessionDetailEl.style.display = 'block';
            sessionDetailEl.classList.add('active');
            sessionDetailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        showNotification(i18n.getMessage('sessionRestoreError'), 'error');
    } finally {
        showLoading(false);
    }
}

// 창별 탭 목록 표시
function displayWindowTabs(session) {
    const windowTabsList = document.getElementById('windowTabsList');
    if (!windowTabsList) {
        console.error('CRITICAL: windowTabsList 요소를 찾을 수 없습니다!');
        return;
    }

    try {
        let allTabs = [];
        
        // 모든 탭을 하나의 배열로 통합
        if (session.windows && Array.isArray(session.windows) && session.windows.length > 0) {
            session.windows.forEach((windowGroup, windowIndex) => {
                if (windowGroup.tabs && Array.isArray(windowGroup.tabs)) {
                    windowGroup.tabs.forEach(tab => {
                        allTabs.push({
                            ...tab,
                            windowIndex: windowIndex + 1
                        });
                    });
                }
            });
        } else if (session.tabs && Array.isArray(session.tabs) && session.tabs.length > 0) {
            allTabs = session.tabs.map((tab, index) => ({
                ...tab,
                windowIndex: 1
            }));
        }
        
        // 전체선택 행과 탭 목록을 함께 생성
        let tabsHTML = `
            <div class="tab-select-all-row">
                <label><input type="checkbox" id="tabSelectAll" checked> 전체 선택</label>
            </div>
        `;
        
        if (allTabs.length > 0) {
            allTabs.forEach((tab, index) => {
                tabsHTML += `
                    <div class="tab-item" data-tab-index="${index}">
                        <input type="checkbox" class="tab-checkbox" checked>
                        <div class="tab-content">
                            <div class="tab-title">${tab.title || '제목 없음'}</div>
                            <div class="tab-url">${tab.url || 'URL 없음'}</div>
                        </div>
                        ${tab.pinned ? '<span class="tab-pinned">[핀]</span>' : ''}
                    </div>
                `;
            });
        } else {
            tabsHTML += `<div class="empty-state"><p>저장된 탭 정보가 없습니다</p></div>`;
        }
        
        windowTabsList.innerHTML = tabsHTML;
        
    } catch (e) {
        console.error('탭 목록 HTML 생성 중 오류:', e);
        windowTabsList.innerHTML = `
            <div class="tab-select-all-row">
                <label><input type="checkbox" id="tabSelectAll" checked> 전체 선택</label>
            </div>
            <div class="empty-state"><p>탭 목록을 표시하는 중 오류가 발생했습니다.</p></div>
        `;
    }
    
    addFilterEventListeners();
    addTabSelectAllEventListeners();
}

// 상세보기 탭 전체선택 체크박스 동작
function addTabSelectAllEventListeners() {
    const tabSelectAll = document.getElementById('tabSelectAll');
    const tabCheckboxes = document.querySelectorAll('.tab-checkbox');

    // 전체선택 체크박스 클릭 시 모든 탭 체크박스 선택/해제
    if (tabSelectAll) {
        tabSelectAll.checked = true;
        tabSelectAll.indeterminate = false;
        tabSelectAll.addEventListener('change', () => {
            tabCheckboxes.forEach(cb => {
                cb.checked = tabSelectAll.checked;
            });
        });
    }

    // 개별 체크박스 변경 시 전체선택 체크박스 상태 갱신
    tabCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checkedCount = Array.from(tabCheckboxes).filter(c => c.checked).length;
            if (checkedCount === 0) {
                tabSelectAll.checked = false;
                tabSelectAll.indeterminate = false;
            } else if (checkedCount === tabCheckboxes.length) {
                tabSelectAll.checked = true;
                tabSelectAll.indeterminate = false;
            } else {
                tabSelectAll.checked = false;
                tabSelectAll.indeterminate = true;
            }
        });
    });
}

// 필터링 이벤트 리스너 추가
function addFilterEventListeners() {
    // URL 필터링
    filterInput.addEventListener('input', (e) => {
        const filterText = e.target.value.toLowerCase();
        const tabItems = windowTabsList.querySelectorAll('.tab-item');
        
        tabItems.forEach(item => {
            const title = item.querySelector('.tab-title').textContent.toLowerCase();
            const url = item.querySelector('.tab-url').textContent.toLowerCase();
            
            if (title.includes(filterText) || url.includes(filterText)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// 선택된 탭만 복원
async function restoreSelectedTabs() {
    if (!currentSession) return;
    
    try {
        showLoading(true);
        
        const selectedTabs = [];
        const checkboxes = windowTabsList.querySelectorAll('.tab-checkbox:checked');
        
        checkboxes.forEach(checkbox => {
            const tabItem = checkbox.closest('.tab-item');
            const tabIndex = parseInt(tabItem.getAttribute('data-tab-index'));
            
            // 모든 탭을 하나의 배열로 통합
            let allTabs = [];
            if (currentSession.windows && Array.isArray(currentSession.windows)) {
                currentSession.windows.forEach(windowGroup => {
                    if (windowGroup.tabs && Array.isArray(windowGroup.tabs)) {
                        allTabs = allTabs.concat(windowGroup.tabs);
                    }
                });
            } else if (currentSession.tabs && Array.isArray(currentSession.tabs)) {
                allTabs = currentSession.tabs;
            }
            
            if (allTabs[tabIndex]) {
                selectedTabs.push(allTabs[tabIndex]);
            }
        });
        
        if (selectedTabs.length === 0) {
            showNotification(i18n.getMessage('noTabsSelected'), 'warning');
            return;
        }
        
        // 선택된 탭들 복원
        for (const tab of selectedTabs) {
            if (tab.url && tab.url.startsWith('http')) {
                await chrome.tabs.create({
                    url: tab.url,
                    pinned: tab.pinned
                });
            }
        }
        
        showNotification(i18n.getMessage('tabsRestored', [selectedTabs.length.toString()]), 'success');
        window.close();
        
    } catch (error) {
        console.error('선택된 탭 복원 오류:', error);
        showNotification(i18n.getMessage('sessionRestoreError'), 'error');
    } finally {
        showLoading(false);
    }
}

// 목록으로 돌아가기
function backToList() {
    // 세션 상세 보기 숨기기
    const sessionDetailEl = document.getElementById('sessionDetail');
    if (sessionDetailEl) {
        sessionDetailEl.style.display = 'none';
        sessionDetailEl.classList.remove('active');
    }
    
    // 세션 목록으로 스크롤
    const sessionsCard = document.querySelector('.sessions-card');
    if (sessionsCard) {
        sessionsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    currentSession = null;
}

// 키보드 단축키 추가
document.addEventListener('keydown', (e) => {
    // ESC 키로 상세보기 닫기
    if (e.key === 'Escape' && currentSession) {
        backToList();
    }
    
    // Ctrl+S로 빠른 저장
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveNowBtn.click();
    }
    
    // Enter 키로 필터링
    if (e.key === 'Enter' && document.activeElement === filterInput) {
        e.preventDefault();
        // 필터링 로직은 이미 input 이벤트로 처리됨
    }
});

// 이벤트 리스너들
document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    showNotification(i18n.getMessage('settingsPageOpened'), 'success');
});

document.getElementById('backToList').addEventListener('click', backToList);
document.getElementById('restoreSelected').addEventListener('click', restoreSelectedTabs);
document.getElementById('restoreSession').addEventListener('click', () => restoreSession(currentSession?.id));
document.getElementById('deleteSession').addEventListener('click', () => deleteSession(currentSession?.id));

document.getElementById('saveNowBtn').addEventListener('click', async () => {
    try {
        showLoading(true);
        const result = await chrome.runtime.sendMessage({ action: 'manualSave' });
        if (result) {
            showNotification(i18n.getMessage('tabsSaved'), 'success');
            await loadSavedSessions();
        } else {
            showNotification(i18n.getMessage('tabsSaveError'), 'error');
        }
    } catch (error) {
        console.error('탭 저장 오류:', error);
        showNotification(i18n.getMessage('tabsSaveProcessingError'), 'error');
    } finally {
        showLoading(false);
    }
});

document.getElementById('checkAutoSaveBtn').addEventListener('click', async () => {
    await checkAutoSaveStatus();
});

document.getElementById('logoutBtn').addEventListener('click', handleLogout);

// 여러 세션 선택 관련 이벤트 리스너
selectAllBtn.addEventListener('click', toggleSelectAll);
deleteSelectedBtn.addEventListener('click', deleteSelectedSessions);
deleteAllBtn.addEventListener('click', deleteAllSessions);

// 세션 선택 이벤트 리스너 추가
function addSessionSelectionEventListeners() {
    const sessionCheckboxes = document.querySelectorAll('.session-checkbox');
    
    sessionCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const sessionId = e.target.dataset.sessionId;
            const sessionItem = e.target.closest('.session-item');
            
            if (e.target.checked) {
                sessionItem.classList.add('selected');
                selectedSessions.add(sessionId);
            } else {
                sessionItem.classList.remove('selected');
                selectedSessions.delete(sessionId);
            }
            
            updateSelectionButtons();
        });
    });
    
    // 세션 아이템 클릭 시 체크박스 토글
    document.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('session-checkbox') && 
                !e.target.classList.contains('btn')) {
                const checkbox = item.querySelector('.session-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        });
    });
}

// 전체 선택/해제
function toggleSelectAll() {
    const sessionCheckboxes = document.querySelectorAll('.session-checkbox');
    const allSelected = sessionCheckboxes.length > 0 && 
                       Array.from(sessionCheckboxes).every(cb => cb.checked);
    
    if (allSelected) {
        // 전체 해제
        sessionCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        });
        selectAllBtn.textContent = '전체 선택';
    } else {
        // 전체 선택
        sessionCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        });
        selectAllBtn.textContent = '전체 해제';
    }
}

// 선택된 세션 삭제
async function deleteSelectedSessions() {
    if (selectedSessions.size === 0) {
        showNotification('삭제할 세션을 선택해주세요', 'warning');
        return;
    }
    
    const confirmMessage = `선택된 ${selectedSessions.size}개 세션을 삭제하시겠습니까?`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const sessionIds = Array.from(selectedSessions);
        const deletedCount = await chrome.runtime.sendMessage({
            action: 'deleteMultipleSessions',
            sessionIds: sessionIds
        });
        
        if (deletedCount > 0) {
            showNotification(`${deletedCount}개 세션이 삭제되었습니다`, 'success');
            selectedSessions.clear();
            // 세션 목록 새로고침
            await loadSavedSessions();
        } else {
            showNotification('세션 삭제에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('선택된 세션 삭제 오류:', error);
        showNotification('세션 삭제 중 오류가 발생했습니다', 'error');
    } finally {
        showLoading(false);
    }
}

// 선택 버튼 상태 업데이트
function updateSelectionButtons() {
    const selectedCount = selectedSessions.size;
    
    if (selectedCount > 0) {
        deleteSelectedBtn.textContent = `삭제 (${selectedCount})`;
        deleteSelectedBtn.disabled = false;
    } else {
        deleteSelectedBtn.textContent = '선택 삭제';
        deleteSelectedBtn.disabled = true;
    }
}

// 전체 세션 삭제
async function deleteAllSessions() {
    if (allSessions.length === 0) {
        showNotification('삭제할 세션이 없습니다', 'warning');
        return;
    }
    
    const confirmMessage = `모든 세션 (${allSessions.length}개)을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const sessionIds = allSessions.map(session => session.id);
        const deletedCount = await chrome.runtime.sendMessage({
            action: 'deleteMultipleSessions',
            sessionIds: sessionIds
        });
        
        if (deletedCount > 0) {
            showNotification(`모든 세션 (${deletedCount}개)이 삭제되었습니다`, 'success');
            selectedSessions.clear();
            // 세션 목록 새로고침
            await loadSavedSessions();
        } else {
            showNotification('세션 삭제에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('전체 세션 삭제 오류:', error);
        showNotification('세션 삭제 중 오류가 발생했습니다', 'error');
    } finally {
        showLoading(false);
    }
} 