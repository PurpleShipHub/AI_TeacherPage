// AI.선생님 다국어 지원 시스템
class I18n {
    constructor() {
        this.currentLanguage = 'ko'; // 기본 언어
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'zh', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi', 'th', 'id', 'nl', 'vi'];
        this.fallbackLanguage = 'ko';
        
        this.init();
    }
    
    async init() {
        // 자동 언어 감지
        this.currentLanguage = this.detectLanguage();
        
        // 언어 파일 로드
        await this.loadLanguage(this.currentLanguage);
        
        // 페이지 업데이트
        this.updatePageContent();
        
        // 언어 변경 리스너 등록
        this.setupLanguageSwitch();
    }
    
    detectLanguage() {
        // 1. URL 파라미터 체크
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && this.supportedLanguages.includes(langParam)) {
            return langParam;
        }
        
        // 2. 로컬 스토리지 체크
        const savedLang = localStorage.getItem('ai_teacher_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }
        
        // 3. 브라우저 언어 감지
        const browserLang = navigator.language || navigator.userLanguage;
        
        // 언어 코드 매핑
        const langMappings = {
            'ko': ['ko', 'ko-KR', 'ko-KP'],
            'en': ['en', 'en-US', 'en-GB', 'en-AU', 'en-CA'],
            'zh': ['zh', 'zh-CN', 'zh-TW', 'zh-HK'],
            'ja': ['ja', 'ja-JP'],
            'es': ['es', 'es-ES', 'es-MX', 'es-AR'],
            'fr': ['fr', 'fr-FR', 'fr-CA'],
            'de': ['de', 'de-DE', 'de-AT'],
            'it': ['it', 'it-IT'],
            'pt': ['pt', 'pt-BR', 'pt-PT'],
            'ru': ['ru', 'ru-RU'],
            'ar': ['ar', 'ar-SA', 'ar-EG'],
            'hi': ['hi', 'hi-IN'],
            'th': ['th', 'th-TH'],
            'id': ['id', 'id-ID'],
            'nl': ['nl', 'nl-NL'],
            'vi': ['vi', 'vi-VN']
        };
        
        // 브라우저 언어와 매핑된 언어 찾기
        for (const [lang, codes] of Object.entries(langMappings)) {
            if (codes.some(code => browserLang.startsWith(code))) {
                return lang;
            }
        }
        
        // 4. 지역 기반 감지 (시간대 기반 추측)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneMapping = {
            'ko': ['Asia/Seoul', 'Asia/Pyongyang'],
            'ja': ['Asia/Tokyo'],
            'zh': ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
            'th': ['Asia/Bangkok'],
            'id': ['Asia/Jakarta'],
            'vi': ['Asia/Ho_Chi_Minh', 'Asia/Saigon'],
            'hi': ['Asia/Kolkata', 'Asia/Mumbai'],
            'ru': ['Europe/Moscow', 'Asia/Yekaterinburg'],
            'ar': ['Asia/Riyadh', 'Asia/Dubai'],
            'de': ['Europe/Berlin'],
            'fr': ['Europe/Paris'],
            'es': ['Europe/Madrid'],
            'it': ['Europe/Rome'],
            'pt': ['Europe/Lisbon'],
            'nl': ['Europe/Amsterdam'],
            'en': ['America/New_York', 'America/Los_Angeles', 'Europe/London']
        };
        
        for (const [lang, timezones] of Object.entries(timezoneMapping)) {
            if (timezones.includes(timezone)) {
                return lang;
            }
        }
        
        // 기본값
        return this.fallbackLanguage;
    }
    
    async loadLanguage(lang) {
        if (this.translations[lang]) {
            return; // 이미 로드됨
        }
        
        try {
            const response = await fetch(`data/languages/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Language file not found: ${lang}`);
            }
            
            this.translations[lang] = await response.json();
            console.log(`✅ 언어 파일 로드 완료: ${lang}`);
        } catch (error) {
            console.error(`❌ 언어 파일 로드 실패: ${lang}`, error);
            
            // 폴백 언어 로드
            if (lang !== this.fallbackLanguage) {
                await this.loadLanguage(this.fallbackLanguage);
                this.currentLanguage = this.fallbackLanguage;
            }
        }
    }
    
    translate(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        // 중첩된 키 탐색
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 폴백 언어로 시도
                let fallbackValue = this.translations[this.fallbackLanguage];
                for (const fk of keys) {
                    if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
                        fallbackValue = fallbackValue[fk];
                    } else {
                        return key; // 키를 그대로 반환
                    }
                }
                value = fallbackValue;
                break;
            }
        }
        
        if (typeof value !== 'string') {
            return key;
        }
        
        // 파라미터 치환
        return value.replace(/\\{\\{(\\w+)\\}\\}/g, (match, param) => {
            return params[param] || match;
        });
    }
    
    async changeLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.error(`지원하지 않는 언어: ${lang}`);
            return;
        }
        
        // 언어 파일 로드
        await this.loadLanguage(lang);
        
        // 현재 언어 변경
        this.currentLanguage = lang;
        
        // 로컬 스토리지에 저장
        localStorage.setItem('ai_teacher_language', lang);
        
        // 페이지 업데이트
        this.updatePageContent();
        
        // 언어 전환 버튼 업데이트
        this.updateLanguageSwitch();
        
        // 언어 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
        
        // 도구 데이터 다시 로드 (DB에서 새 언어로)
        if (typeof loadData === 'function') {
            await loadData();
        }
        
        // 언어 변경 알림 (선택사항)
        this.showLanguageChangeNotification(lang);
        
        console.log(`🌍 언어 변경: ${lang}`);
    }
    
    updatePageContent() {
        // data-i18n 속성을 가진 모든 요소 업데이트
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
                element.value = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // 제목 업데이트
        const title = this.translate('ui.title');
        document.title = title;
        
        // 메타 태그 업데이트
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.translate('ui.subtitle');
        }
    }
    
    setupLanguageSwitch() {
        // 언어 변경 버튼 생성
        this.createLanguageSwitch();
        
        // 언어 변경 이벤트 리스너
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('language-option')) {
                const lang = e.target.dataset.lang;
                this.changeLanguage(lang);
                
                // 드롭다운 닫기
                const dropdown = e.target.closest('.language-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('open');
                }
            }
        });
    }
    
    createLanguageSwitch() {
        const languageSwitch = document.createElement('div');
        languageSwitch.className = 'language-switch';
        
        // 언어 선택 드롭다운 생성
        const languageOptions = {
            'ko': '🇰🇷 한국어',
            'en': '🇺🇸 English',
            'zh': '🇨🇳 中文',
            'ja': '🇯🇵 日本語',
            'es': '🇪🇸 Español',
            'fr': '🇫🇷 Français',
            'de': '🇩🇪 Deutsch',
            'it': '🇮🇹 Italiano',
            'pt': '🇵🇹 Português',
            'ru': '🇷🇺 Русский',
            'ar': '🇸🇦 العربية',
            'hi': '🇮🇳 हिन्दी',
            'th': '🇹🇭 ไทย',
            'id': '🇮🇩 Bahasa Indonesia',
            'nl': '🇳🇱 Nederlands',
            'vi': '🇻🇳 Tiếng Việt'
        };
        
        const currentLangLabel = languageOptions[this.currentLanguage];
        
        languageSwitch.innerHTML = `
            <div class="language-dropdown">
                <button class="language-current" onclick="this.parentElement.classList.toggle('open')">
                    ${currentLangLabel} <span class="arrow">▼</span>
                </button>
                <div class="language-options">
                    ${Object.entries(languageOptions).map(([lang, label]) => 
                        `<button class="language-option ${lang === this.currentLanguage ? 'active' : ''}" data-lang="${lang}">
                            ${label}
                        </button>`
                    ).join('')}
                </div>
            </div>
        `;
        
        // 헤더에 추가
        const header = document.querySelector('.header') || document.body;
        header.appendChild(languageSwitch);
        
        // 스타일 추가
        this.addLanguageSwitchStyles();
        
        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!languageSwitch.contains(e.target)) {
                languageSwitch.querySelector('.language-dropdown').classList.remove('open');
            }
        });
    }
    
    addLanguageSwitchStyles() {
        if (document.getElementById('language-switch-styles')) {
            return; // 이미 추가됨
        }
        
        const styles = document.createElement('style');
        styles.id = 'language-switch-styles';
        styles.textContent = `
            .language-switch {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }
            
            .language-dropdown {
                position: relative;
                display: inline-block;
            }
            
            .language-current {
                background: rgba(255, 255, 255, 0.9);
                border: none;
                padding: 8px 12px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 12px;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }
            
            .language-current:hover {
                background: rgba(255, 255, 255, 1);
            }
            
            .language-current .arrow {
                font-size: 10px;
                transition: transform 0.3s ease;
            }
            
            .language-dropdown.open .arrow {
                transform: rotate(180deg);
            }
            
            .language-options {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 200px;
                max-height: 300px;
                overflow-y: auto;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                margin-top: 5px;
            }
            
            .language-dropdown.open .language-options {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .language-option {
                width: 100%;
                background: none;
                border: none;
                padding: 10px 15px;
                text-align: left;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s ease;
                white-space: nowrap;
            }
            
            .language-option:hover {
                background: rgba(0, 123, 255, 0.1);
            }
            
            .language-option.active {
                background: #007bff;
                color: white;
            }
            
            .language-option:first-child {
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
            }
            
            .language-option:last-child {
                border-bottom-left-radius: 10px;
                border-bottom-right-radius: 10px;
            }
            
            @media (max-width: 768px) {
                .language-switch {
                    top: 10px;
                    right: 10px;
                }
                
                .language-current {
                    padding: 6px 10px;
                    font-size: 11px;
                }
                
                .language-options {
                    min-width: 180px;
                }
                
                .language-option {
                    padding: 8px 12px;
                    font-size: 11px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    updateLanguageSwitch() {
        const languageSwitch = document.querySelector('.language-switch');
        if (!languageSwitch) return;
        
        const languageOptions = {
            'ko': '🇰🇷 한국어',
            'en': '🇺🇸 English',
            'zh': '🇨🇳 中文',
            'ja': '🇯🇵 日本語',
            'es': '🇪🇸 Español',
            'fr': '🇫🇷 Français',
            'de': '🇩🇪 Deutsch',
            'it': '🇮🇹 Italiano',
            'pt': '🇵🇹 Português',
            'ru': '🇷🇺 Русский',
            'ar': '🇸🇦 العربية',
            'hi': '🇮🇳 हिन्दी',
            'th': '🇹🇭 ไทย',
            'id': '🇮🇩 Bahasa Indonesia',
            'nl': '🇳🇱 Nederlands',
            'vi': '🇻🇳 Tiếng Việt'
        };
        
        // 현재 언어 버튼 텍스트 업데이트
        const currentButton = languageSwitch.querySelector('.language-current');
        if (currentButton) {
            const currentLangLabel = languageOptions[this.currentLanguage];
            currentButton.innerHTML = `${currentLangLabel} <span class="arrow">▼</span>`;
        }
        
        // 옵션들의 active 상태 업데이트
        const options = languageSwitch.querySelectorAll('.language-option');
        options.forEach(option => {
            const lang = option.dataset.lang;
            if (lang === this.currentLanguage) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    showLanguageChangeNotification(lang) {
        const languageOptions = {
            'ko': '🇰🇷 한국어',
            'en': '🇺🇸 English',
            'zh': '🇨🇳 中文',
            'ja': '🇯🇵 日本語',
            'es': '🇪🇸 Español',
            'fr': '🇫🇷 Français',
            'de': '🇩🇪 Deutsch',
            'it': '🇮🇹 Italiano',
            'pt': '🇵🇹 Português',
            'ru': '🇷🇺 Русский',
            'ar': '🇸🇦 العربية',
            'hi': '🇮🇳 हिन्दी',
            'th': '🇹🇭 ไทย',
            'id': '🇮🇩 Bahasa Indonesia',
            'nl': '🇳🇱 Nederlands',
            'vi': '🇻🇳 Tiếng Việt'
        };
        
        // 기존 알림 제거
        const existingNotification = document.querySelector('.language-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 새 알림 생성
        const notification = document.createElement('div');
        notification.className = 'language-notification';
        notification.innerHTML = `
            <span class="notification-icon">🌍</span>
            <span class="notification-text">${languageOptions[lang]}</span>
        `;
        
        // 스타일 추가
        if (!document.getElementById('language-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'language-notification-styles';
            styles.textContent = `
                .language-notification {
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    background: rgba(0, 123, 255, 0.9);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 1001;
                    animation: slideInNotification 0.3s ease, fadeOutNotification 0.3s ease 1.7s forwards;
                    backdrop-filter: blur(10px);
                }
                
                @keyframes slideInNotification {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeOutNotification {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                
                @media (max-width: 768px) {
                    .language-notification {
                        top: 60px;
                        right: 10px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // 2초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    // 유틸리티 메서드
    t(key, params = {}) {
        return this.translate(key, params);
    }
    
    // 언어별 도구 필터링 (한국어 지원 여부 등)
    filterToolsByLanguage(tools) {
        if (this.currentLanguage === 'ko') {
            // 한국어 사용자의 경우 한국어 지원 도구 우선
            return tools.sort((a, b) => {
                const aHasKorean = a.tags && a.tags.includes('korean');
                const bHasKorean = b.tags && b.tags.includes('korean');
                
                if (aHasKorean && !bHasKorean) return -1;
                if (!aHasKorean && bHasKorean) return 1;
                return 0;
            });
        }
        
        return tools;
    }
}

// 전역 i18n 인스턴스
window.i18n = new I18n();

// 편의 함수
window.t = (key, params) => window.i18n.translate(key, params);