// AI Teacher UI Components Library

/**
 * 버튼 컴포넌트 생성
 * @param {string} text - 버튼 텍스트
 * @param {string} className - CSS 클래스명
 * @param {Function} onClick - 클릭 이벤트 핸들러
 * @param {Object} options - 추가 옵션
 * @returns {HTMLButtonElement}
 */
function createButton(text, className = '', onClick = null, options = {}) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `btn ${className}`;
    
    if (onClick) {
        button.onclick = onClick;
    }
    
    // 추가 속성 설정
    if (options.disabled) {
        button.disabled = true;
    }
    
    if (options.ariaLabel) {
        button.setAttribute('aria-label', options.ariaLabel);
    }
    
    if (options.dataAttributes) {
        Object.entries(options.dataAttributes).forEach(([key, value]) => {
            button.setAttribute(`data-${key}`, value);
        });
    }
    
    return button;
}

/**
 * 말풍선 컴포넌트 생성
 * @param {string} content - 말풍선 내용
 * @param {Object} options - 추가 옵션
 * @returns {HTMLDivElement}
 */
function createSpeechBubble(content, options = {}) {
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    
    if (options.className) {
        bubble.className += ` ${options.className}`;
    }
    
    if (options.html) {
        bubble.innerHTML = content;
    } else {
        bubble.textContent = content;
    }
    
    if (options.animate) {
        bubble.style.opacity = '0';
        setTimeout(() => {
            bubble.style.transition = 'opacity 0.3s ease-in';
            bubble.style.opacity = '1';
        }, 10);
    }
    
    return bubble;
}

/**
 * 캐릭터 이미지 컴포넌트 생성
 * @param {string} state - 캐릭터 상태 (explaining, thinking, curious)
 * @param {Object} options - 추가 옵션
 * @returns {HTMLImageElement}
 */
function createCharacterImage(state = 'explaining', options = {}) {
    const img = document.createElement('img');
    img.src = `images/ai_teacher_${state}.png`;
    img.alt = 'AI Teacher';
    img.className = 'character';
    
    if (options.className) {
        img.className += ` ${options.className}`;
    }
    
    if (options.animate) {
        img.style.animationName = options.animate;
    }
    
    return img;
}

/**
 * 프로그레스 바 컴포넌트 생성
 * @param {number} progress - 진행률 (0-100)
 * @param {Object} options - 추가 옵션
 * @returns {HTMLDivElement}
 */
function createProgressBar(progress, options = {}) {
    const container = document.createElement('div');
    container.className = 'progress-bar-container';
    
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    
    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill';
    fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    
    if (options.color) {
        fill.style.backgroundColor = options.color;
    }
    
    if (options.showText) {
        const text = document.createElement('span');
        text.className = 'progress-text';
        text.textContent = `${progress}%`;
        container.appendChild(text);
    }
    
    bar.appendChild(fill);
    container.appendChild(bar);
    
    return container;
}

/**
 * 카드 컴포넌트 생성
 * @param {Object} data - 카드 데이터
 * @param {Object} options - 추가 옵션
 * @returns {HTMLDivElement}
 */
function createToolCard(data, options = {}) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    
    if (options.className) {
        card.className += ` ${options.className}`;
    }
    
    // 카드 헤더
    const header = document.createElement('div');
    header.className = 'tool-card-header';
    
    const title = document.createElement('h3');
    title.className = 'tool-card-title';
    title.textContent = data.name;
    
    const category = document.createElement('span');
    category.className = 'tool-card-category';
    category.textContent = data.category;
    
    header.appendChild(title);
    header.appendChild(category);
    
    // 카드 본문
    const body = document.createElement('div');
    body.className = 'tool-card-body';
    
    const description = document.createElement('p');
    description.className = 'tool-card-description';
    description.textContent = data.description;
    
    body.appendChild(description);
    
    // 카드 푸터
    const footer = document.createElement('div');
    footer.className = 'tool-card-footer';
    
    if (data.pricing) {
        const pricing = document.createElement('span');
        pricing.className = 'tool-card-pricing';
        pricing.textContent = data.pricing.type;
        footer.appendChild(pricing);
    }
    
    if (data.tags && data.tags.length > 0) {
        const tags = document.createElement('div');
        tags.className = 'tool-card-tags';
        
        data.tags.slice(0, 3).forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tool-card-tag';
            tagSpan.textContent = tag;
            tags.appendChild(tagSpan);
        });
        
        footer.appendChild(tags);
    }
    
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    
    if (options.onClick) {
        card.style.cursor = 'pointer';
        card.onclick = () => options.onClick(data);
    }
    
    return card;
}

/**
 * 로딩 스피너 컴포넌트 생성
 * @param {Object} options - 추가 옵션
 * @returns {HTMLDivElement}
 */
function createLoadingSpinner(options = {}) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    if (options.size) {
        spinner.style.width = options.size;
        spinner.style.height = options.size;
    }
    
    if (options.color) {
        spinner.style.borderTopColor = options.color;
    }
    
    if (options.text) {
        const container = document.createElement('div');
        container.className = 'loading-container';
        
        const text = document.createElement('p');
        text.className = 'loading-text';
        text.textContent = options.text;
        
        container.appendChild(spinner);
        container.appendChild(text);
        
        return container;
    }
    
    return spinner;
}

/**
 * 알림 토스트 표시
 * @param {string} message - 알림 메시지
 * @param {string} type - 알림 타입 (success, error, warning, info)
 * @param {number} duration - 표시 시간 (밀리초)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 애니메이션 시작
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

/**
 * 모달 다이얼로그 생성
 * @param {Object} config - 모달 설정
 * @returns {HTMLDivElement}
 */
function createModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    if (config.title) {
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = config.title;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => closeModal(modal);
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        content.appendChild(header);
    }
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    if (config.content) {
        if (typeof config.content === 'string') {
            body.innerHTML = config.content;
        } else {
            body.appendChild(config.content);
        }
    }
    
    content.appendChild(body);
    
    if (config.buttons && config.buttons.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        
        config.buttons.forEach(btn => {
            const button = createButton(
                btn.text,
                btn.className || 'btn-secondary',
                () => {
                    if (btn.onClick) btn.onClick();
                    if (btn.closeModal !== false) {
                        closeModal(modal);
                    }
                }
            );
            footer.appendChild(button);
        });
        
        content.appendChild(footer);
    }
    
    modal.appendChild(backdrop);
    modal.appendChild(content);
    
    backdrop.onclick = () => {
        if (config.closeOnBackdrop !== false) {
            closeModal(modal);
        }
    };
    
    return modal;
}

/**
 * 모달 닫기
 * @param {HTMLElement} modal - 모달 엘리먼트
 */
function closeModal(modal) {
    modal.classList.add('modal-closing');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

// 컴포넌트 내보내기
window.AITeacherComponents = {
    createButton,
    createSpeechBubble,
    createCharacterImage,
    createProgressBar,
    createToolCard,
    createLoadingSpinner,
    showToast,
    createModal,
    closeModal
};