// Internationalization utility for TabVault
class I18n {
    constructor() {
        this.currentLocale = 'en';
        this.messages = {};
        this.init();
    }

    async init() {
        // Load saved language preference
        const result = await chrome.storage.local.get(['language']);
        this.currentLocale = result.language || 'en';
        
        // Load messages for current locale
        await this.loadMessages();
        
        // Apply translations to the page
        this.applyTranslations();
        
        // 초기화 완료 이벤트 발생
        window.dispatchEvent(new CustomEvent('i18nReady', { detail: { locale: this.currentLocale } }));
    }

    async loadMessages() {
        try {
            const response = await fetch(chrome.runtime.getURL(`_locales/${this.currentLocale}/messages.json`));
            this.messages = await response.json();
        } catch (error) {
            // Silently fallback to English without showing warning to user
            const response = await fetch(chrome.runtime.getURL('_locales/en/messages.json'));
            this.messages = await response.json();
        }
    }

    getMessage(key, substitutions = []) {
        const message = this.messages[key];
        if (!message) {
            // Return a more user-friendly fallback for common keys
            const fallbacks = {
                'language': 'Language',
                'english': 'English',
                'korean': '한국어',
                'localMode': 'Local Mode',
                'githubSetup': 'GitHub Setup'
            };
            return fallbacks[key] || key;
        }

        let text = message.message;
        
        // Handle substitutions
        if (substitutions && substitutions.length > 0) {
            substitutions.forEach((sub, index) => {
                text = text.replace(`$${index + 1}`, sub);
            });
        }

        return text;
    }

    async setLanguage(locale) {
        this.currentLocale = locale;
        await chrome.storage.local.set({ language: locale });
        await this.loadMessages();
        this.applyTranslations();
        
        // 언어 변경 이벤트 발생 (다른 스크립트에서 감지할 수 있도록)
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { locale } }));
    }

    applyTranslations() {
        // Apply translations to elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.getMessage(key);
            
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });

        // Apply translations to elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.getMessage(key);
        });

        // Update page title
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = this.getMessage('appName');
        }

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLocale;
    }

    // Helper method to create language selector
    createLanguageSelector() {
        const container = document.createElement('div');
        container.className = 'language-selector';
        container.innerHTML = `
            <label for="languageSelect">${this.getMessage('language')}:</label>
            <select id="languageSelect">
                <option value="en" ${this.currentLocale === 'en' ? 'selected' : ''}>${this.getMessage('english')}</option>
                <option value="ko" ${this.currentLocale === 'ko' ? 'selected' : ''}>${this.getMessage('korean')}</option>
            </select>
        `;

        const select = container.querySelector('#languageSelect');
        select.addEventListener('change', async (e) => {
            await this.setLanguage(e.target.value);
            // 언어 변경 후 즉시 적용
            this.applyTranslations();
            // 언어 선택기 다시 생성하여 올바른 선택 상태 반영
            if (container.parentNode) {
                container.parentNode.replaceChild(this.createLanguageSelector(), container);
            }
        });

        return container;
    }

    // Helper method to update dynamic text
    updateElementText(elementId, messageKey, substitutions = []) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.getMessage(messageKey, substitutions);
        }
    }

    // Helper method to update placeholder
    updatePlaceholder(elementId, messageKey, substitutions = []) {
        const element = document.getElementById(elementId);
        if (element) {
            element.placeholder = this.getMessage(messageKey, substitutions);
        }
    }
}

// Create global i18n instance
const i18n = new I18n();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, i18n };
} 