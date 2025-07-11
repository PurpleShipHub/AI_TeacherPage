// AI.선생님 Quiz App - Visual Novel Style
import { UltraFastAkinator } from './ultra-fast-akinator.js';

let ultraFastEngine = null;
let currentQuestion = null;
let questionHistory = [];
let currentHistoryIndex = -1;

// 화면 전환 함수
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // 비주얼 노벨 스타일 전환 효과
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.style.opacity = '0';
        setTimeout(() => {
            activeScreen.style.opacity = '1';
        }, 50);
    }
}

// 데이터 로드
async function loadData() {
    try {
        // 로딩 표시
        showLoadingProgress('AI 도구 데이터베이스 초기화 중...');
        
        // 약간의 지연을 두고 로딩 UI가 표시되도록
        await new Promise(resolve => setTimeout(resolve, 100));
        
        ultraFastEngine = new UltraFastAkinator();
        const loaded = await ultraFastEngine.loadTools();
        
        if (loaded) {
            console.log('지능형 AI 도구 분석 엔진 활성화');
            
            // 완료 메시지 표시
            updateLoadingProgress(100, '로딩 완료! 준비되었습니다.');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            hideLoadingProgress();
        } else {
            throw new Error('초고속 엔진 로드 실패');
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        hideLoadingProgress();
        const errorMessage = window.i18n ? window.i18n.t('errors.dataLoadFailed') : '데이터를 불러오는데 실패했습니다.';
        alert(errorMessage);
    }
}

// 로딩 진행률 표시
function showLoadingProgress(message) {
    const existingLoader = document.getElementById('loadingProgress');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    const loader = document.createElement('div');
    loader.id = 'loadingProgress';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    loader.innerHTML = `
        <div style="text-align: center; max-width: 400px;">
            <div style="font-size: 24px; margin-bottom: 20px;">
                <span style="display: inline-block; animation: pulse 2s infinite;">🤖</span> 
                AI Teacher 준비 중<span id="loadingDots" style="animation: dots 1.5s infinite;">...</span>
            </div>
            <div id="loadingMessage" style="font-size: 16px; margin-bottom: 20px; color: #ccc;">${message}</div>
            <div style="width: 300px; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                <div id="progressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
            <div id="progressText" style="font-size: 14px; margin-top: 10px; color: #999;">0%</div>
            <div style="font-size: 12px; margin-top: 15px; color: #666;">
                26,000개 이상의 AI 도구를 로딩하고 있습니다.<br>
                잠시만 기다려주세요...
            </div>
        </div>
    `;
    document.body.appendChild(loader);
}

// 로딩 진행률 업데이트
window.updateLoadingProgress = function(percentage, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${percentage}%`;
    }
    
    if (loadingMessage && message) {
        loadingMessage.textContent = message;
    }
}

// 로딩 진행률 숨기기
function hideLoadingProgress() {
    const loader = document.getElementById('loadingProgress');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            if (loader && loader.parentNode) {
                loader.remove();
            }
        }, 500);
    }
}

// 퀴즈 시작
window.startQuiz = function startQuiz() {
    if (!ultraFastEngine) {
        const message = window.i18n ? window.i18n.t('ui.dataLoading') : '아직 준비 중입니다. 잠시만 기다려주세요...';
        showToast && showToast(message, 'info');
        return;
    }
    
    // 초고속 엔진 시작
    ultraFastEngine.restart();
    questionHistory = [];
    currentHistoryIndex = -1;
    console.log('지능형 분석 시스템으로 분석 시작');
    
    showQuestion();
    showScreen('questionScreen');
}

// 질문 표시 (비주얼 노벨 스타일)
async function showQuestion(questionText = null) {
    if (!ultraFastEngine) {
        showResult();
        return;
    }
    
    if (ultraFastEngine.isLeafNode()) {
        showResult();
        return;
    }
    
    // 질문 텍스트가 전달되지 않았다면 현재 질문 가져오기
    if (!questionText) {
        currentQuestion = ultraFastEngine.getCurrentQuestion();
        if (!currentQuestion) {
            showResult();
            return;
        }
        questionText = currentQuestion.text;
    } else {
        // 질문 텍스트가 전달되었다면 현재 질문 객체 생성
        currentQuestion = { text: questionText };
    }
    
    // 질문 히스토리 추가
    questionHistory.push(currentQuestion);
    currentHistoryIndex = questionHistory.length - 1;
    
    // 대화 텍스트 애니메이션과 함께 표시
    const questionTextElement = document.getElementById('questionText');
    questionTextElement.style.opacity = '0';
    questionTextElement.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        questionTextElement.textContent = questionText;
        questionTextElement.style.opacity = '1';
        questionTextElement.style.transform = 'translateY(0)';
    }, 200);
    
    // 진단 정보 표시 (디버깅용)
    const diagnostics = ultraFastEngine.getDiagnostics();
    console.log('Question:', questionText);
    console.log('Diagnostics:', diagnostics);
    
    const answerButtons = document.getElementById('answerButtons');
    answerButtons.innerHTML = '';
    
    // 선택지 생성 (3지선다)
    setTimeout(() => {
        if (currentQuestion.options) {
            // 질문별 커스텀 옵션
            Object.entries(currentQuestion.options).forEach(([key, text], index) => {
                const btn = createVisualNovelChoice(text, key, index);
                answerButtons.appendChild(btn);
            });
        } else {
            // 3지선다 옵션
            const choices = [
                { key: 'yes', text: '네 맞습니다' },
                { key: 'no', text: '아니오 확실히 아닙니다' },
                { key: 'unknown', text: '잘 모르겠습니다' }
            ];
            
            choices.forEach((choice, index) => {
                const btn = createVisualNovelChoice(choice.text, choice.key, index);
                answerButtons.appendChild(btn);
            });
        }
    }, 500);
    
    // 컨트롤 버튼 상태 업데이트
    updateControlButtons();
}

// 비주얼 노벨 스타일 선택지 생성
function createVisualNovelChoice(text, key, index) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = text;
    btn.style.animationDelay = `${index * 0.1}s`;
    
    // 클릭 이벤트 - 비주얼 노벨 스타일 효과
    btn.onclick = () => {
        // 선택 효과
        btn.style.transform = 'scale(0.95)';
        btn.style.background = 'rgba(102, 126, 234, 0.6)';
        
        // 다른 선택지들 흐리게
        const allChoices = document.querySelectorAll('.choices-container .btn');
        allChoices.forEach(choice => {
            if (choice !== btn) {
                choice.style.opacity = '0.3';
                choice.style.pointerEvents = 'none';
            }
        });
        
        // 잠시 후 다음 질문으로
        setTimeout(() => {
            handleAnswer(key);
        }, 800);
    };
    
    return btn;
}

// 컨트롤 버튼 상태 업데이트
function updateControlButtons() {
    // 3지선다에서는 컨트롤 버튼 불필요
}

// 답변 처리
function handleAnswer(answer) {
    if (!ultraFastEngine) {
        showResult();
        return;
    }
    
    const result = ultraFastEngine.answerQuestion(answer);
    
    if (result.result === 'continue') {
        console.log('답변 처리됨:', answer);
        
        // 다음 질문으로 이동 (질문 텍스트 전달)
        setTimeout(() => {
            showQuestion(result.question);
        }, 300);
    } else if (result.result === 'success' || result.result === 'final_candidates') {
        console.log('결과 준비됨:', result);
        showResult();
    } else {
        console.log('답변 처리 실패, 에러 화면으로 이동');
        showScreen('errorScreen');
    }
}

// 결과 표시 (비주얼 노벨 스타일)
function showResult() {
    if (!ultraFastEngine) {
        showScreen('errorScreen');
        return;
    }
    
    const finalResults = ultraFastEngine.getFinalResults();
    if (!finalResults || !finalResults.recommendations || finalResults.recommendations.length === 0) {
        showScreen('errorScreen');
        return;
    }
    
    // 첫 번째 추천 도구 사용
    const result = finalResults.recommendations[0];
    console.log('결과:', result);
    
    // 결과 화면 표시
    showScreen('resultScreen');
    
    // 결과 텍스트 애니메이션
    setTimeout(() => {
        const toolName = document.getElementById('toolName');
        const toolDescription = document.getElementById('toolDescription');
        const toolLink = document.getElementById('toolLink');
        
        if (toolName) {
            toolName.textContent = result.name || '알 수 없는 도구';
            toolName.style.opacity = '0';
            toolName.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                toolName.style.opacity = '1';
                toolName.style.transform = 'translateY(0)';
            }, 200);
        }
        
        if (toolDescription) {
            toolDescription.textContent = result.description || '설명이 없습니다.';
            toolDescription.style.opacity = '0';
            toolDescription.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                toolDescription.style.opacity = '1';
                toolDescription.style.transform = 'translateY(0)';
            }, 400);
        }
        
        if (toolLink && result.url) {
            toolLink.href = result.url;
            toolLink.style.opacity = '0';
            toolLink.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                toolLink.style.opacity = '1';
                toolLink.style.transform = 'translateY(0)';
            }, 600);
        }
        
        // 추가 정보 표시
        displayAdditionalInfo(result);
        
    }, 500);
}

// 추가 정보 표시
function displayAdditionalInfo(result) {
    const toolScore = document.getElementById('toolScore');
    const toolStrengths = document.getElementById('toolStrengths');
    const toolUseCases = document.getElementById('toolUseCases');
    const alternatives = document.getElementById('alternatives');
    const progressInfo = document.getElementById('progressInfo');
    
    if (toolScore && result.score) {
        toolScore.innerHTML = `<div class="match-score">매칭 점수: ${result.score}%</div>`;
        toolScore.style.opacity = '0';
        setTimeout(() => {
            toolScore.style.opacity = '1';
        }, 800);
    }
    
    if (toolStrengths && result.strengths) {
        toolStrengths.innerHTML = `
            <h4>주요 특징:</h4>
            <ul>${result.strengths.map(strength => `<li>${strength}</li>`).join('')}</ul>
        `;
        toolStrengths.style.opacity = '0';
        setTimeout(() => {
            toolStrengths.style.opacity = '1';
        }, 1000);
    }
    
    if (toolUseCases && result.useCases) {
        toolUseCases.innerHTML = `
            <h4>사용 사례:</h4>
            <ul>${result.useCases.map(useCase => `<li>${useCase}</li>`).join('')}</ul>
        `;
        toolUseCases.style.opacity = '0';
        setTimeout(() => {
            toolUseCases.style.opacity = '1';
        }, 1200);
    }
    
    if (alternatives && result.alternatives) {
        alternatives.innerHTML = `
            <h4>대안 도구:</h4>
            <ul>${result.alternatives.map(alt => `<li>${alt}</li>`).join('')}</ul>
        `;
        alternatives.style.opacity = '0';
        setTimeout(() => {
            alternatives.style.opacity = '1';
        }, 1400);
    }
    
    if (progressInfo) {
        const diagnostics = ultraFastEngine.getDiagnostics();
        progressInfo.innerHTML = `
            <div class="progress-stats">
                <span>질문 수: ${diagnostics.totalQuestions || 0}</span>
                <span>남은 도구: ${diagnostics.remainingTools || 0}</span>
            </div>
        `;
        progressInfo.style.opacity = '0';
        setTimeout(() => {
            progressInfo.style.opacity = '1';
        }, 1600);
    }
}

// 재시작
window.restart = function restart() {
    questionHistory = [];
    currentHistoryIndex = -1;
    showScreen('startScreen');
}

// 소셜 공유
window.shareOnTwitter = function shareOnTwitter(event) {
    event.preventDefault();
    const text = `AI Teacher에서 나에게 맞는 AI 도구를 찾았어요!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

window.shareOnFacebook = function shareOnFacebook(event) {
    event.preventDefault();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

// 토스트 메시지 (비주얼 노벨 스타일)
window.showToast = function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 애니메이션 트리거
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Teacher - Visual Novel Style 초기화');
    
    // 다국어 지원 초기화
    if (window.i18n && window.i18n.init) {
        window.i18n.init();
    }
    
    // 데이터 로드
    loadData();
    
    // 키보드 이벤트 처리
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // ESC 키로 메인 화면으로
            showScreen('startScreen');
        } else if (e.key === 'Enter' || e.key === ' ') {
            // Enter나 스페이스로 다음 진행
            const currentScreen = document.querySelector('.screen.active');
            if (currentScreen && currentScreen.id === 'questionScreen') {
                // 첫 번째 선택지 선택
                const firstChoice = document.querySelector('.choices-container .btn');
                if (firstChoice) {
                    firstChoice.click();
                }
            }
        }
    });
    
    // 터치/클릭 이벤트 최적화
    document.addEventListener('touchstart', function() {}, { passive: true });
    
    console.log('비주얼 노벨 스타일 AI Teacher 준비 완료');
});

// 유틸리티 함수들
function createButton(text, className, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `btn ${className}`;
    btn.onclick = onClick;
    return btn;
}

function translateCategory(category) {
    const translations = {
        'productivity': '생산성 도구',
        'creativity': '창의성 도구',
        'communication': '커뮤니케이션',
        'analysis': '분석 도구',
        'automation': '자동화 도구',
        'education': '교육 도구',
        'entertainment': '엔터테인먼트',
        'business': '비즈니스 도구',
        'development': '개발 도구',
        'design': '디자인 도구'
    };
    return translations[category] || category;
}

function translatePricing(pricing) {
    const translations = {
        'free': '무료',
        'freemium': '부분 무료',
        'paid': '유료',
        'subscription': '구독',
        'one-time': '일회성 결제'
    };
    return translations[pricing] || pricing;
}

// 전역 함수 노출
window.showScreen = showScreen;
window.showToast = showToast;