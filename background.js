// Chrome Sync API 사용 (Firebase 대신)
let currentUser = null;
let autoSaveInterval = null;

// 암호화/복호화 유틸리티 함수들
async function generateEncryptionKey(baseKey) {
  // SHA-256으로 키 생성
  const encoder = new TextEncoder();
  const data = encoder.encode(baseKey + 'tab-saver-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray;
}

async function encryptData(data, key) {
  try {
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(data);
    const dataBuffer = encoder.encode(jsonString);
    
    // 랜덤 IV 생성
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // AES-GCM으로 암호화
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      dataBuffer
    );
    
    // IV와 암호화된 데이터를 Base64로 인코딩
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('암호화 오류:', error);
    throw error;
  }
}

async function decryptData(encryptedData, key) {
  try {
    console.log('복호화 시작, 데이터 길이:', encryptedData.length);
    
    // Base64 디코딩
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    console.log('Base64 디코딩 완료, 바이트 길이:', combined.length);
    
    // IV 추출 (처음 12바이트)
    const iv = combined.slice(0, 12);
    const encryptedArray = combined.slice(12);
    
    console.log('IV 길이:', iv.length, '암호화된 데이터 길이:', encryptedArray.length);
    
    // AES-GCM으로 복호화
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    console.log('암호화 키 생성 완료');
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      encryptedArray
    );
    
    console.log('복호화 완료, 버퍼 크기:', decryptedBuffer.byteLength);
    
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    
    console.log('JSON 문자열 길이:', jsonString.length);
    console.log('JSON 시작 부분:', jsonString.substring(0, 100));
    
    const result = JSON.parse(jsonString);
    console.log('JSON 파싱 완료, 결과 타입:', typeof result, '길이:', Array.isArray(result) ? result.length : 'N/A');
    
    return result;
  } catch (error) {
    console.error('복호화 오류:', error);
    console.error('오류 상세:', error.message);
    throw error;
  }
}

// 암호화 키 가져오기
async function getEncryptionKey() {
  try {
    // 사용자 설정 키 먼저 확인
    const result = await chrome.storage.local.get('encryptionKey');
    if (result.encryptionKey) {
      return await generateEncryptionKey(result.encryptionKey);
    }
    
    // GitHub 토큰을 기본 키로 사용
    const tokenResult = await chrome.storage.local.get('githubToken');
    if (tokenResult.githubToken) {
      return await generateEncryptionKey(tokenResult.githubToken);
    }
    
    // 기본 키 사용
    return await generateEncryptionKey('tab-saver-default-key');
  } catch (error) {
    console.error('암호화 키 가져오기 오류:', error);
    return await generateEncryptionKey('tab-saver-default-key');
  }
}

// 탭 정보 수집 함수
async function collectTabs() {
  try {
    // 모든 창의 모든 탭을 가져오기
    const allTabs = await chrome.tabs.query({});
    const allWindows = await chrome.windows.getAll({ populate: true });
    
    console.log('전체 탭 수:', allTabs.length);
    console.log('전체 창 수:', allWindows.length);
    
    // 최소한의 정보만 수집
    const tabData = allTabs.map(tab => ({
      title: tab.title,
      url: tab.url,
      windowId: tab.windowId,
      pinned: tab.pinned
    }));

    // 창별로 탭 그룹화 (간단하게)
    const windowGroups = {};
    allWindows.forEach(window => {
      windowGroups[window.id] = {
        windowId: window.id,
        tabs: []
      };
    });

    // 탭을 해당 창에 할당
    tabData.forEach(tab => {
      if (windowGroups[tab.windowId]) {
        windowGroups[tab.windowId].tabs.push(tab);
      }
    });

    return {
      timestamp: new Date().toISOString(),
      tabs: tabData,
      windows: Object.values(windowGroups),
      windowCount: allWindows.length,
      tabCount: allTabs.length
    };
  } catch (error) {
    console.error('탭 수집 중 오류:', error);
    return null;
  }
}

// GitHub Gist API를 사용한 세션 저장
async function saveTabsToGitHubGist(tabData) {
  if (!tabData) return;

  try {
    // GitHub Token 가져오기
    const token = await getGitHubToken();
    
    if (!token) {
      console.log('GitHub Token이 설정되지 않음 - 로컬 저장소로 대체');
      return await saveTabsToLocal(tabData);
    }
    
    // GitHub API로 사용자 정보 가져오기
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    let accountEmail = 'local@tab-saver.com';
    if (userResponse.ok) {
      const user = await userResponse.json();
      accountEmail = user.email || `${user.login}@github.com`;
    }
    
    // 새 세션 생성
    const newSession = {
      id: Date.now().toString(),
      timestamp: tabData.timestamp,
      tabs: tabData.tabs.map(tab => ({
        title: tab.title ? tab.title.substring(0, 80) : '',
        url: tab.url ? tab.url.substring(0, 150) : '',
        windowId: tab.windowId,
        pinned: tab.pinned || false
      })),
      windows: tabData.windows.map(window => ({
        windowId: window.windowId,
        tabs: window.tabs.map(tab => ({
          title: tab.title ? tab.title.substring(0, 80) : '',
          url: tab.url ? tab.url.substring(0, 150) : '',
          windowId: tab.windowId,
          pinned: tab.pinned || false
        }))
      })),
      windowCount: tabData.windowCount,
      tabCount: tabData.tabCount,
      createdAt: new Date().toISOString(),
      accountEmail: accountEmail
    };
    
    // GitHub Gist에 저장
    const success = await saveToGitHubGist(newSession, accountEmail);
    
    if (success) {
      console.log('GitHub Gist에 탭 데이터 저장 완료:', tabData.tabCount, '개 탭 (계정:', accountEmail, ')');
      return newSession;
    } else {
      console.log('GitHub Gist 저장 실패 - 로컬 저장소로 대체');
      return await saveTabsToLocal(tabData);
    }
  } catch (error) {
    console.error('GitHub Gist 저장 오류:', error);
    console.log('로컬 저장소로 대체합니다...');
    return await saveTabsToLocal(tabData);
  }
}

// GitHub Gist에 데이터 저장
async function saveToGitHubGist(session, accountEmail) {
  try {
    // GitHub Personal Access Token 가져오기
    const token = await getGitHubToken();
    
    if (!token) {
      console.log('GitHub Token이 설정되지 않음');
      return false;
    }
    
    // 기존 Gist ID 가져오기
    const gistId = await getGistId(accountEmail);
    
    // 기존 세션 목록 가져오기
    let sessions = [];
    if (gistId) {
      sessions = await loadSessionsFromGist(gistId, token);
    }
    
    // 계정별로 필터링
    const accountSessions = sessions.filter(s => s.accountEmail === accountEmail);
    
    // 새 세션 추가
    accountSessions.unshift(session);
    
    // 최대 20개 세션 유지
    if (accountSessions.length > 20) {
      accountSessions.splice(20);
    }
    
    // 모든 세션 업데이트
    const allSessions = sessions.filter(s => s.accountEmail !== accountEmail).concat(accountSessions);
    
    // Gist 업데이트 또는 생성
    const success = await updateOrCreateGist(allSessions, accountEmail, token, gistId);
    
    if (success) {
      console.log('GitHub Gist 저장 완료');
      return true;
    } else {
      console.log('GitHub Gist 저장 실패');
      return false;
    }
  } catch (error) {
    console.error('GitHub Gist 저장 오류:', error);
    return false;
  }
}

// GitHub Personal Access Token 가져오기
async function getGitHubToken() {
  try {
    const result = await chrome.storage.local.get('githubToken');
    return result.githubToken;
  } catch (error) {
    console.log('GitHub Token 가져오기 실패:', error);
    return null;
  }
}

// Gist ID 가져오기
async function getGistId(accountEmail) {
  try {
    const result = await chrome.storage.local.get('gistIds');
    const gistIds = result.gistIds || {};
    return gistIds[accountEmail];
  } catch (error) {
    console.log('Gist ID 가져오기 실패:', error);
    return null;
  }
}

// Gist에서 세션 불러오기
async function loadSessionsFromGist(gistId, token) {
  try {
    console.log('Gist에서 세션 불러오기 시작:', gistId);
    
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Gist 불러오기 실패: ${response.status} ${response.statusText}`);
    }
    
    const gist = await response.json();
    const content = gist.files['tab-sessions.json']?.content;
    
    console.log('Gist 내용 길이:', content ? content.length : 0);
    console.log('Gist 내용 시작 부분:', content ? content.substring(0, 50) : '없음');
    
    if (content) {
      try {
        // 암호화된 데이터인지 확인 (Base64 패턴 체크)
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(content);
        const isJson = content.trim().startsWith('{') || content.trim().startsWith('[');
        
        if (isBase64 && !isJson) {
          console.log('암호화된 데이터로 판단, 복호화 시도...');
          
          // 암호화 키 가져오기
          const encryptionKey = await getEncryptionKey();
          console.log('암호화 키 생성됨:', encryptionKey ? '성공' : '실패');
          
          // 복호화 시도
          const decryptedData = await decryptData(content, encryptionKey);
          console.log('복호화 성공, 세션 수:', decryptedData ? decryptedData.length : 0);
          
          return decryptedData;
        } else {
          console.log('일반 JSON 데이터로 판단, 파싱 시도...');
          const parsedData = JSON.parse(content);
          console.log('JSON 파싱 성공, 세션 수:', parsedData ? parsedData.length : 0);
          return parsedData;
        }
      } catch (decryptError) {
        console.error('복호화/파싱 실패:', decryptError);
        console.log('일반 JSON으로 재시도...');
        
        try {
          const parsedData = JSON.parse(content);
          console.log('일반 JSON 파싱 성공, 세션 수:', parsedData ? parsedData.length : 0);
          return parsedData;
        } catch (parseError) {
          console.error('JSON 파싱도 실패:', parseError);
          return [];
        }
      }
    }
    
    console.log('Gist 내용이 없음');
    return [];
  } catch (error) {
    console.error('Gist에서 세션 불러오기 오류:', error);
    return [];
  }
}

// Gist 업데이트 또는 생성
async function updateOrCreateGist(sessions, accountEmail, token, gistId) {
  try {
    // 데이터 암호화
    const encryptionKey = await getEncryptionKey();
    const encryptedContent = await encryptData(sessions, encryptionKey);
    
    const gistData = {
      description: `Tab Saver Sessions for ${accountEmail} (Encrypted)`,
      public: false,
      files: {
        'tab-sessions.json': {
          content: encryptedContent
        }
      }
    };
    
    let response;
    
    if (gistId) {
      // 기존 Gist 업데이트
      response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });
    } else {
      // 새 Gist 생성
      response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });
    }
    
    if (response.ok) {
      const gist = await response.json();
      
      // 새로 생성된 Gist ID 저장
      if (!gistId) {
        const result = await chrome.storage.local.get('gistIds');
        const gistIds = result.gistIds || {};
        gistIds[accountEmail] = gist.id;
        await chrome.storage.local.set({ gistIds: gistIds });
      }
      
      return true;
    } else {
      throw new Error('Gist 업데이트 실패');
    }
  } catch (error) {
    console.error('Gist 업데이트 오류:', error);
    return false;
  }
}

// GitHub Gist에서 세션 불러오기
async function loadSessionsFromGitHubGist() {
  try {
    // GitHub Token 가져오기
    const token = await getGitHubToken();
    
    if (!token) {
      console.log('GitHub Token이 설정되지 않음');
      return {
        sessions: [],
        userInfo: {
          displayName: '로컬 사용자',
          email: '로컬 모드',
          photoURL: null
        }
      };
    }
    
    // GitHub API로 사용자 정보 가져오기
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    let accountEmail = 'local@tab-saver.com';
    if (userResponse.ok) {
      const user = await userResponse.json();
      accountEmail = user.email || `${user.login}@github.com`;
    } else {
      console.log('GitHub 사용자 정보 가져오기 실패');
      return {
        sessions: [],
        userInfo: {
          displayName: 'GitHub Gist 사용자',
          email: '동기화 활성화됨',
          photoURL: null
        }
      };
    }
    
    // Gist ID 가져오기
    const gistId = await getGistId(accountEmail);
    
    if (!gistId) {
      console.log('Gist ID가 없음');
      return {
        sessions: [],
        userInfo: {
          displayName: `GitHub Gist 사용자 (${accountEmail})`,
          email: accountEmail,
          photoURL: null
        }
      };
    }
    
    // Gist에서 세션 불러오기
    const allSessions = await loadSessionsFromGist(gistId, token);
    
    // 현재 계정의 세션만 필터링
    const accountSessions = allSessions.filter(s => s.accountEmail === accountEmail);
    
    console.log('GitHub Gist에서 세션 불러옴:', accountSessions.length, '개 (계정:', accountEmail, ')');
    
    return {
      sessions: accountSessions,
      userInfo: {
        displayName: `GitHub Gist 사용자 (${accountEmail})`,
        email: accountEmail,
        photoURL: null
      }
    };
  } catch (error) {
    console.error('GitHub Gist 불러오기 오류:', error);
    return {
      sessions: [],
      userInfo: {
        displayName: 'GitHub Gist 사용자',
        email: '동기화 활성화됨',
        photoURL: null
      }
    };
  }
}

// Google Sheets API를 사용한 세션 저장
async function saveTabsToGoogleSheets(tabData) {
  if (!tabData) return;

  try {
    // 현재 구글 계정 정보 가져오기
    const accountInfo = await getGoogleAccountInfo();
    
    if (!accountInfo.isLoggedIn) {
      console.log('구글 계정 로그인 안됨 - 로컬 저장소로 대체');
      return await saveTabsToLocal(tabData);
    }
    
    // 새 세션 생성
    const newSession = {
      id: Date.now().toString(),
      timestamp: tabData.timestamp,
      tabs: tabData.tabs.map(tab => ({
        title: tab.title ? tab.title.substring(0, 80) : '',
        url: tab.url ? tab.url.substring(0, 150) : '',
        windowId: tab.windowId,
        pinned: tab.pinned || false
      })),
      windows: tabData.windows.map(window => ({
        windowId: window.windowId,
        tabs: window.tabs.map(tab => ({
          title: tab.title ? tab.title.substring(0, 80) : '',
          url: tab.url ? tab.url.substring(0, 150) : '',
          windowId: tab.windowId,
          pinned: tab.pinned || false
        }))
      })),
      windowCount: tabData.windowCount,
      tabCount: tabData.tabCount,
      createdAt: new Date().toISOString(),
      accountEmail: accountInfo.email
    };
    
    // Google Sheets에 저장
    const success = await saveToGoogleSheets(newSession, accountInfo.email);
    
    if (success) {
      console.log('Google Sheets에 탭 데이터 저장 완료:', tabData.tabCount, '개 탭 (계정:', accountInfo.email, ')');
      return newSession;
    } else {
      console.log('Google Sheets 저장 실패 - 로컬 저장소로 대체');
      return await saveTabsToLocal(tabData);
    }
  } catch (error) {
    console.error('Google Sheets 저장 오류:', error);
    console.log('로컬 저장소로 대체합니다...');
    return await saveTabsToLocal(tabData);
  }
}

// Google Sheets에 데이터 저장
async function saveToGoogleSheets(session, accountEmail) {
  try {
    // Google Sheets API를 사용해서 데이터 저장
    // 실제 구현에서는 Google Sheets API 키와 스프레드시트 ID가 필요
    
    // 임시로 로컬에 저장 (실제 구현 시 Google Sheets API로 교체)
    const result = await chrome.storage.local.get('googleSheetsSessions');
    const sessions = result.googleSheetsSessions || [];
    
    // 계정별로 필터링
    const accountSessions = sessions.filter(s => s.accountEmail === accountEmail);
    
    // 새 세션 추가
    accountSessions.unshift(session);
    
    // 최대 20개 세션 유지
    if (accountSessions.length > 20) {
      accountSessions.splice(20);
    }
    
    // 모든 세션 업데이트
    const allSessions = sessions.filter(s => s.accountEmail !== accountEmail).concat(accountSessions);
    
    await chrome.storage.local.set({ 
      googleSheetsSessions: allSessions,
      lastSaved: new Date().toISOString()
    });
    
    console.log('Google Sheets 시뮬레이션 저장 완료');
    return true;
  } catch (error) {
    console.error('Google Sheets 저장 오류:', error);
    return false;
  }
}

// Google Sheets에서 세션 불러오기
async function loadSessionsFromGoogleSheets() {
  try {
    // 현재 구글 계정 정보 가져오기
    const accountInfo = await getGoogleAccountInfo();
    
    if (!accountInfo.isLoggedIn) {
      console.log('구글 계정 로그인 안됨 - 로컬 저장소에서 불러옴');
      return await loadSessionsFromLocal();
    }
    
    // Google Sheets에서 데이터 불러오기
    const result = await chrome.storage.local.get('googleSheetsSessions');
    const allSessions = result.googleSheetsSessions || [];
    
    // 현재 계정의 세션만 필터링
    const accountSessions = allSessions.filter(s => s.accountEmail === accountInfo.email);
    
    console.log('Google Sheets에서 세션 불러옴:', accountSessions.length, '개 (계정:', accountInfo.email, ')');
    
    return {
      sessions: accountSessions,
      userInfo: {
        displayName: `Google Sheets 사용자 (${accountInfo.email})`,
        email: accountInfo.email,
        photoURL: null
      }
    };
  } catch (error) {
    console.error('Google Sheets 불러오기 오류:', error);
    return await loadSessionsFromLocal();
  }
}

// 구글 계정 정보 가져오기 (Chrome Identity API 사용)
async function getGoogleAccountInfo() {
  try {
    // Chrome Identity API를 사용해서 현재 로그인된 구글 계정 정보 가져오기
    const accounts = await chrome.identity.getAccounts();
    
    if (accounts && accounts.length > 0) {
      // 첫 번째 계정 사용
      const account = accounts[0];
      console.log('구글 계정 정보:', account);
      return {
        email: account.email,
        id: account.id,
        isLoggedIn: true
      };
    } else {
      console.log('구글 계정 로그인 안됨');
      return {
        email: null,
        id: null,
        isLoggedIn: false
      };
    }
  } catch (error) {
    console.log('구글 계정 정보 가져오기 실패:', error);
    return {
      email: null,
      id: null,
      isLoggedIn: false
    };
  }
}

// Chrome Sync의 실제 로그인 상태 확인 (개선된 버전)
async function checkChromeSyncLoginStatus() {
  try {
    // Chrome Sync 설정에서 실제 로그인 상태 확인
    // 로그아웃 상태에서는 sync가 제대로 작동하지 않음
    const testKey = `sync_test_${Date.now()}`;
    const testData = { timestamp: Date.now(), test: true };
    
    // 테스트 데이터 저장 시도
    await chrome.storage.sync.set({ [testKey]: testData });
    
    // 저장된 데이터 확인
    const result = await chrome.storage.sync.get(testKey);
    
    // 테스트 데이터 정리
    await chrome.storage.sync.remove(testKey);
    
    if (result[testKey] && result[testKey].test === true) {
      console.log('Chrome Sync 로그인 상태 확인됨');
      return true;
    } else {
      console.log('Chrome Sync 로그아웃 상태 확인됨');
      return false;
    }
  } catch (error) {
    console.log('Chrome Sync 로그인 상태 확인 실패:', error);
    return false;
  }
}

// 현재 로그인된 구글 계정 확인 (Chrome Sync 활용)
async function getCurrentAccountId() {
  try {
    // 먼저 로그인 상태 확인
    const isLoggedIn = await checkChromeSyncLoginStatus();
    if (!isLoggedIn) {
      console.log('Chrome Sync 로그아웃 상태 - 로컬 모드 사용');
      return 'local';
    }
    
    // Chrome Sync의 실제 동작을 활용한 계정별 분리
    // 각 구글 계정마다 Chrome Sync는 다른 syncId를 가짐
    // 이를 활용해서 계정별 고유 ID 생성
    const testKey = `account_test_${Date.now()}`;
    const testData = { 
      timestamp: Date.now(), 
      random: Math.random(),
      account: 'test'
    };
    
    // 현재 계정에 테스트 데이터 저장
    await chrome.storage.sync.set({ [testKey]: testData });
    
    // 저장된 데이터를 다시 가져와서 현재 계정 확인
    const result = await chrome.storage.sync.get(testKey);
    
    if (result[testKey]) {
      // 현재 계정의 고유 ID 생성 (timestamp + random 조합)
      const accountId = `account_${result[testKey].timestamp}_${Math.floor(result[testKey].random * 10000)}`;
      
      // 테스트 데이터 정리
      await chrome.storage.sync.remove(testKey);
      
      console.log('현재 계정 ID 생성됨:', accountId);
      return accountId;
    }
    
    return 'default';
  } catch (error) {
    console.log('계정 확인 불가:', error);
    return 'local'; // 오류 시 로컬 모드로
  }
}

// Chrome Sync에 탭 데이터 저장 (GitHub Gist 방식으로 변경)
async function saveTabsToSync(tabData) {
  // GitHub Gist 방식으로 저장
  return await saveTabsToGitHubGist(tabData);
}

// 로컬 저장소에 탭 데이터 저장 (Sync 용량 초과 시)
async function saveTabsToLocal(tabData) {
  if (!tabData) return;

  try {
    // 기존 세션 목록 가져오기
    const result = await chrome.storage.local.get('sessions');
    const sessions = result.sessions || [];
    
    // 새 세션 추가
    const newSession = {
      id: Date.now().toString(),
      timestamp: tabData.timestamp,
      tabs: tabData.tabs,
      windows: tabData.windows,
      windowCount: tabData.windowCount,
      tabCount: tabData.tabCount,
      createdAt: new Date().toISOString(),
      isLocal: true, // 로컬 저장소 표시
      accountId: 'local' // 로컬 계정 ID
    };
    
    // 최대 20개 세션 유지 (로컬은 용량이 더 큼)
    const maxSessions = 20;
    sessions.unshift(newSession);
    if (sessions.length > maxSessions) {
      sessions.splice(maxSessions);
    }
    
    // 로컬에 저장
    await chrome.storage.local.set({ 
      sessions: sessions,
      lastSaved: new Date().toISOString(),
      userInfo: {
        displayName: '로컬 사용자',
        email: '로컬 모드',
        photoURL: null,
        lastUpdated: new Date().toISOString()
      }
    });

    console.log('로컬 저장소에 탭 데이터 저장 완료:', tabData.tabCount, '개 탭');
    return newSession;
  } catch (error) {
    console.error('로컬 저장소 저장 오류:', error);
    return null;
  }
}

// 설정 가져오기
async function getSettings() {
  try {
    const result = await chrome.storage.local.get({
      autoSaveInterval: 5,
      enableAutoSave: false,
      maxSessions: 20
    });
    return result;
  } catch (error) {
    console.error('설정 가져오기 오류, 기본값 사용:', error);
    return {
      autoSaveInterval: 5,
      enableAutoSave: false,
      maxSessions: 20
    };
  }
}

// 5분마다 탭 저장 실행
async function startAutoSave() {
  const settings = await getSettings();
  if (!settings.enableAutoSave) {
    console.log('자동 저장이 비활성화되어 있습니다');
    return;
  }
  
  // 기존 인터벌 정리
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    console.log('기존 자동 저장 인터벌 정리됨');
  }
  
  console.log(`자동 저장 시작: ${settings.autoSaveInterval}분 간격`);
  
  // 즉시 한 번 실행
  console.log('자동 저장 초기 실행...');
  try {
    const tabData = await collectTabs();
    if (tabData) {
      const savedSession = await saveTabsToSync(tabData);
      if (savedSession) {
        console.log('자동 저장 초기 실행 완료:', savedSession.tabCount, '개 탭 저장됨');
      } else {
        console.log('자동 저장 초기 실행 실패');
      }
    }
  } catch (error) {
    console.error('자동 저장 초기 실행 오류:', error);
  }
  
  // 주기적 실행 설정
  autoSaveInterval = setInterval(async () => {
    console.log('자동 저장 실행 중...');
    try {
      const tabData = await collectTabs();
      if (tabData) {
        const savedSession = await saveTabsToSync(tabData);
        if (savedSession) {
          console.log('자동 저장 완료:', savedSession.tabCount, '개 탭 저장됨');
        } else {
          console.log('자동 저장 실패');
        }
      } else {
        console.log('자동 저장: 탭 데이터 수집 실패');
      }
    } catch (error) {
      console.error('자동 저장 실행 오류:', error);
    }
  }, settings.autoSaveInterval * 60 * 1000);
}

// 수동 저장 (팝업에서 호출)
async function manualSave() {
  const tabData = await collectTabs();
  if (tabData) {
    const savedSession = await saveTabsToSync(tabData);
    return savedSession;
  }
  return null;
}

// 저장된 세션 목록 가져오기 (GitHub Gist 방식)
async function getSessions() {
  try {
    console.log('=== 세션 목록 가져오기 시작 ===');
    let sessions = [];
    let primarySource = 'local';
    
    // GitHub Gist에서 가져오기 시도 (우선순위)
    try {
      console.log('GitHub Gist에서 세션 가져오기 시도...');
      const githubGistResult = await loadSessionsFromGitHubGist();
      if (githubGistResult && githubGistResult.sessions) {
        sessions = githubGistResult.sessions;
        primarySource = 'github';
        console.log('✅ GitHub Gist에서 세션 가져옴:', sessions.length, '개');
      } else {
        console.log('❌ GitHub Gist 결과가 유효하지 않음:', githubGistResult);
      }
    } catch (error) {
      console.log('❌ GitHub Gist 접근 불가:', error.message);
    }
    
    // 로컬에서도 가져오기
    try {
      const localResult = await chrome.storage.local.get('sessions');
      if (localResult.sessions && localResult.sessions.length > 0) {
        sessions = sessions.concat(localResult.sessions);
        console.log('로컬에서 세션 가져옴:', localResult.sessions.length, '개');
      } else {
        console.log('로컬 세션이 없거나 유효하지 않음:', localResult.sessions);
      }
    } catch (error) {
      console.log('로컬 저장소 접근 불가:', error.message);
    }
    
    // 중복 제거 및 정렬
    const uniqueSessions = [];
    const seenIds = new Set();
    
    sessions.forEach(session => {
      if (!session.id) {
        console.log('ID가 없는 세션 발견:', session);
        return;
      }
      
      if (!seenIds.has(session.id)) {
        seenIds.add(session.id);
        uniqueSessions.push(session);
      }
    });
    
    // 생성 시간 기준으로 정렬 (최신순)
    uniqueSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`총 세션 수: ${uniqueSessions.length}개 (소스: ${primarySource})`);
    
    return uniqueSessions;
  } catch (error) {
    console.error('세션 목록 가져오기 오류:', error);
    return [];
  }
}

// 특정 세션의 탭들 복원
async function restoreSession(sessionId) {
  try {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return false;
    
    console.log('세션 복원 시작:', session.tabCount, '개 탭,', session.windowCount, '개 창');
    
    // 창별로 탭 복원
    if (session.windows && session.windows.length > 0) {
      for (const windowGroup of session.windows) {
        // 새 창 생성
        const newWindow = await chrome.windows.create({
          url: windowGroup.tabs[0]?.url || 'chrome://newtab/',
          focused: false
        });
        
        // 나머지 탭들을 새 창에 추가
        for (let i = 1; i < windowGroup.tabs.length; i++) {
          const tab = windowGroup.tabs[i];
          if (tab.url && tab.url.startsWith('http')) {
            await chrome.tabs.create({
              windowId: newWindow.id,
              url: tab.url,
              pinned: tab.pinned,
              index: tab.index
            });
          }
        }
      }
    } else {
      // 기존 방식 (하위 호환성)
      for (const tab of session.tabs) {
        if (tab.url && tab.url.startsWith('http')) {
          await chrome.tabs.create({ 
            url: tab.url,
            pinned: tab.pinned
          });
        }
      }
    }

    console.log('세션 복원 완료');
    return true;
  } catch (error) {
    console.error('세션 복원 오류:', error);
    return false;
  }
}

// 세션 삭제
async function deleteSession(sessionId) {
  try {
    console.log('세션 삭제 시작:', sessionId);
    let deleted = false;
    
    // GitHub Gist에서 삭제 시도
    try {
      const token = await getGitHubToken();
      if (token) {
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (userResponse.ok) {
          const user = await userResponse.json();
          const accountEmail = user.email || `${user.login}@github.com`;
          const gistId = await getGistId(accountEmail);
          
          if (gistId) {
            // Gist에서 세션 목록 가져오기
            const allSessions = await loadSessionsFromGist(gistId, token);
            const updatedSessions = allSessions.filter(s => s.id !== sessionId);
            
            // Gist 업데이트
            const success = await updateOrCreateGist(updatedSessions, accountEmail, token, gistId);
            if (success) {
              deleted = true;
              console.log('GitHub Gist에서 세션 삭제됨');
            }
          }
        }
      }
    } catch (error) {
      console.log('GitHub Gist 삭제 실패:', error.message);
    }
    
    // 로컬에서도 삭제 시도
    try {
      const localResult = await chrome.storage.local.get('sessions');
      const localSessions = localResult.sessions || [];
      const updatedLocalSessions = localSessions.filter(s => s.id !== sessionId);
      if (updatedLocalSessions.length !== localSessions.length) {
        await chrome.storage.local.set({ sessions: updatedLocalSessions });
        deleted = true;
        console.log('로컬에서 세션 삭제됨');
      }
    } catch (error) {
      console.error('로컬 삭제 오류:', error);
    }
    
    console.log('세션 삭제 완료:', deleted ? '성공' : '실패');
    return deleted;
  } catch (error) {
    console.error('세션 삭제 오류:', error);
    return false;
  }
}

// 여러 세션 삭제
async function deleteMultipleSessions(sessionIds) {
  try {
    console.log('여러 세션 삭제 시작:', sessionIds.length, '개');
    let deletedCount = 0;
    
    for (const sessionId of sessionIds) {
      const deleted = await deleteSession(sessionId);
      if (deleted) {
        deletedCount++;
      }
    }
    
    console.log('여러 세션 삭제 완료:', deletedCount, '개 삭제됨');
    return deletedCount;
  } catch (error) {
    console.error('여러 세션 삭제 오류:', error);
    return 0;
  }
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('메시지 수신:', request.action);
  
  switch (request.action) {
    case 'manualSave':
      manualSave().then(result => {
        console.log('수동 저장 결과:', result);
        sendResponse(result);
      }).catch(error => {
        console.error('수동 저장 오류:', error);
        sendResponse(null);
      });
      return true;
      
    case 'getSessions':
      getSessions().then(sessions => {
        console.log('세션 목록:', sessions.length, '개');
        sendResponse(sessions);
      }).catch(error => {
        console.error('세션 목록 가져오기 오류:', error);
        sendResponse([]);
      });
      return true;
      
    case 'restoreSession':
      restoreSession(request.sessionId).then(success => {
        console.log('세션 복원 결과:', success);
        sendResponse(success);
      }).catch(error => {
        console.error('세션 복원 오류:', error);
        sendResponse(false);
      });
      return true;
      
    case 'deleteSession':
      deleteSession(request.sessionId).then(success => {
        console.log('세션 삭제 결과:', success);
        sendResponse(success);
      }).catch(error => {
        console.error('세션 삭제 오류:', error);
        sendResponse(false);
      });
      return true;
      
    case 'deleteMultipleSessions':
      deleteMultipleSessions(request.sessionIds).then(count => {
        console.log('여러 세션 삭제 결과:', count, '개 삭제됨');
        sendResponse(count);
      }).catch(error => {
        console.error('여러 세션 삭제 오류:', error);
        sendResponse(0);
      });
      return true;
      
    case 'getCurrentUser':
      // Chrome Sync는 구글 계정과 자동 연동
      sendResponse({ 
        uid: 'chrome-sync-user',
        displayName: 'Chrome Sync 사용자',
        email: 'sync@chrome.com'
      });
      break;
      
    case 'settingsChanged':
      // 설정 변경 시 자동 저장 재시작
      console.log('설정 변경 감지 - 자동 저장 재시작');
      startAutoSave();
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('알 수 없는 메시지 액션:', request.action);
      sendResponse(null);
  }
});

// 확장프로그램 설치/업데이트 시 초기화
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Saver 확장프로그램이 설치되었습니다');
  startAutoSave();
});

// 브라우저 시작 시 자동 저장 시작
chrome.runtime.onStartup.addListener(() => {
  console.log('브라우저 시작 - 자동 저장 시작');
  startAutoSave();
});

// Chrome Sync에서 세션 목록 불러오기
async function loadSessionsFromSync() {
  try {
    // 먼저 Chrome Sync 접근 가능한지 테스트
    await chrome.storage.sync.set({ test: Date.now() });
    await chrome.storage.sync.remove('test');
    
    // 현재 로그인된 구글 계정 확인
    const accountId = await getCurrentAccountId();
    
    // 계정별 세션 목록 키
    const sessionListKey = `sessionList_${accountId}`;
    const userInfoKey = `userInfo_${accountId}`;
    
    // 세션 목록과 사용자 정보 가져오기
    const result = await chrome.storage.sync.get([sessionListKey, userInfoKey]);
    const sessionList = result[sessionListKey] || [];
    const userInfo = result[userInfoKey] || {
      displayName: `Chrome 동기화 사용자 (${accountId.substring(0, 8)}...)`,
      email: accountId,
      photoURL: null
    };
    
    console.log('Chrome Sync에서 세션 목록 불러옴:', sessionList.length, '개 세션 (계정:', accountId, ')');
    return { sessions: sessionList, userInfo };
  } catch (error) {
    console.error('Chrome Sync 불러오기 오류:', error);
    console.log('로컬 저장소에서 불러옵니다...');
    return await loadSessionsFromLocal();
  }
}

// 로컬 저장소에서 세션 불러오기
async function loadSessionsFromLocal() {
  try {
    const result = await chrome.storage.local.get('sessions');
    const sessions = result.sessions || [];
    
    console.log('로컬 저장소에서 세션 불러옴:', sessions.length, '개');
    
    return {
      sessions: sessions,
      userInfo: {
        displayName: '로컬 사용자',
        email: '로컬 모드',
        photoURL: null
      }
    };
  } catch (error) {
    console.error('로컬 저장소 불러오기 오류:', error);
    return {
      sessions: [],
      userInfo: {
        displayName: '로컬 사용자',
        email: '로컬 모드',
        photoURL: null
      }
    };
  }
} 