// AI.Teacher with Akinator Engine
let tools = [];
let questions = [];
let akinatorQuestions = [];
let akinatorEngine = null;
let currentQuestionIndex = 0;
let answers = [];
let remainingTools = [];
let useAkinatorMode = true;

// 사용자 선호도 저장
let userPreferences = {
    creativity: 0.5,
    ease_of_use: 0.5,
    professional: 0.5,
    cost_effectiveness: 0.5,
    korean_support: 0.5,
    collaboration: 0.5
};

// 화면 전환 함수
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// 데이터 로드
async function loadData() {
    try {
        const [toolsResponse, questionsResponse, akinatorQuestionsResponse] = await Promise.all([
            fetch('data/tools.json'),
            fetch('data/questions.json'),
            fetch('data/akinator_questions.json')
        ]);
        
        tools = await toolsResponse.json();
        questions = await questionsResponse.json();
        akinatorQuestions = await akinatorQuestionsResponse.json();
        remainingTools = [...tools];
        
        // 아키네이터 엔진 초기화
        if (useAkinatorMode && window.AkinatorEngine) {
            akinatorEngine = new window.AkinatorEngine(tools, akinatorQuestions);
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        const errorMessage = window.i18n ? window.i18n.t('errors.dataLoadFailed') : '데이터를 불러오는데 실패했습니다.';
        alert(errorMessage);
    }
}

// 퀴즈 시작
function startQuiz() {
    if (!tools || tools.length === 0) {
        const message = window.i18n ? window.i18n.t('ui.dataLoading') : '데이터를 불러오는 중입니다...';
        showToast && showToast(message, 'info');
        return;
    }
    
    currentQuestionIndex = 0;
    answers = [];
    remainingTools = [...tools];
    
    // 언어별 도구 필터링
    if (window.i18n) {
        remainingTools = window.i18n.filterToolsByLanguage(remainingTools);
    }
    
    // 아키네이터 모드 사용
    if (useAkinatorMode && akinatorEngine) {
        akinatorEngine = new window.AkinatorEngine(remainingTools, akinatorQuestions);
        showAkinatorQuestion();
    } else {
        showQuestion();
    }
    
    showScreen('questionScreen');
}

// 아키네이터 질문 표시
function showAkinatorQuestion() {
    if (!akinatorEngine) {
        showResult();
        return;
    }
    
    // 게임 종료 조건 체크
    if (akinatorEngine.shouldEndGame()) {
        showResult();
        return;
    }
    
    // 최적 질문 선택
    const question = akinatorEngine.selectBestQuestion();
    if (!question) {
        showResult();
        return;
    }
    
    // 질문 표시
    const questionText = window.i18n ? window.i18n.t(`questions.${question.id}`) : question.text;
    document.getElementById('questionText').textContent = questionText;
    
    // 진행 상황 표시 제거 (사용자 요청)
    
    // 답변 버튼 생성
    const answerButtons = document.getElementById('answerButtons');
    answerButtons.innerHTML = '';
    answerButtons.classList.remove('grid');
    
    const yesText = window.i18n ? window.i18n.t('ui.yes') : '네';
    const noText = window.i18n ? window.i18n.t('ui.no') : '아니요';
    const unknownText = window.i18n ? window.i18n.t('ui.unknown') : '모름';
    
    const buttonCreator = getButtonCreator();
    const yesBtn = buttonCreator(yesText, 'btn-yes', () => handleAkinatorAnswer(question.id, 'yes'));
    const noBtn = buttonCreator(noText, 'btn-no', () => handleAkinatorAnswer(question.id, 'no'));
    const unknownBtn = buttonCreator(unknownText, 'btn-unknown', () => handleAkinatorAnswer(question.id, 'unknown'));
    
    answerButtons.appendChild(yesBtn);
    answerButtons.appendChild(noBtn);
    answerButtons.appendChild(unknownBtn);
}

// 아키네이터 답변 처리
function handleAkinatorAnswer(questionId, answer) {
    if (!akinatorEngine) return;
    
    // 캐릭터 이미지 변경
    document.getElementById('questionCharacter').src = 'images/ai_teacher_thinking.png';
    
    // 아키네이터 엔진에 답변 전달
    akinatorEngine.processAnswer(questionId, answer);
    
    // 잠시 후 다음 질문
    setTimeout(() => {
        document.getElementById('questionCharacter').src = 'images/ai_teacher_curious.png';
        showAkinatorQuestion();
    }, 800);
}

// 아키네이터 진행 상황 업데이트
function updateAkinatorProgress(gameState) {
    const progressDiv = document.getElementById('akinatorProgress');
    if (progressDiv) {
        const progressPercentage = (gameState.progress * 100).toFixed(0);
        const confidencePercentage = (gameState.confidence * 100).toFixed(0);
        
        progressDiv.innerHTML = `
            <div class="progress-info">
                <div>🎯 남은 도구: ${gameState.remainingTools}개</div>
                <div>📊 신뢰도: ${confidencePercentage}%</div>
                <div>❓ 질문: ${gameState.questionsAsked}/${gameState.maxQuestions}</div>
            </div>
        `;
    }
}

// 기존 질문 표시 (호환성 유지)
function showQuestion() {
    if (remainingTools.length <= 1) {
        showResult();
        return;
    }
    
    const nextQuestion = getNextQuestion();
    if (!nextQuestion) {
        showResult();
        return;
    }
    
    const { question, index } = nextQuestion;
    currentQuestionIndex = index;
    
    const questionText = window.i18n ? window.i18n.t(`questions.${question.id}`) : question.text;
    document.getElementById('questionText').textContent = questionText;
    
    const answerButtons = document.getElementById('answerButtons');
    answerButtons.innerHTML = '';
    
    if (question.type === 'yes_no') {
        answerButtons.classList.remove('grid');
        
        const yesText = window.i18n ? window.i18n.t('ui.yes') : '네';
        const noText = window.i18n ? window.i18n.t('ui.no') : '아니요';
        const unknownText = window.i18n ? window.i18n.t('ui.unknown') : '모름';
        
        const buttonCreator = getButtonCreator();
        const yesBtn = buttonCreator(yesText, 'btn-yes', () => handleAnswer('yes'));
        const noBtn = buttonCreator(noText, 'btn-no', () => handleAnswer('no'));
        const unknownBtn = buttonCreator(unknownText, 'btn-unknown', () => handleAnswer('unknown'));
        
        answerButtons.appendChild(yesBtn);
        answerButtons.appendChild(noBtn);
        answerButtons.appendChild(unknownBtn);
    } else if (question.type === 'scale' && question.scale) {
        answerButtons.classList.add('grid');
        
        const buttonCreator = getButtonCreator();
        for (let i = question.scale.min; i <= question.scale.max; i++) {
            const label = question.scale.labels[i - question.scale.min] || i.toString();
            const btn = buttonCreator(`${i}. ${label}`, 'btn-scale', () => handleAnswer(i.toString()));
            answerButtons.appendChild(btn);
        }
    } else if (question.type === 'category' && question.options) {
        answerButtons.classList.add('grid');
        
        const buttonCreator = getButtonCreator();
        question.options.forEach(option => {
            let translatedOption = option;
            if (window.i18n) {
                translatedOption = window.i18n.t(`options.${option}`) !== `options.${option}` 
                    ? window.i18n.t(`options.${option}`) 
                    : window.i18n.t(`categories.${option}`) !== `categories.${option}` 
                        ? window.i18n.t(`categories.${option}`) 
                        : option;
            }
            const btn = buttonCreator(translatedOption, 'btn-primary', () => handleAnswer(option));
            answerButtons.appendChild(btn);
        });
    }
    
    updateProgress();
}

// 다음 질문 찾기 (기존 모드용)
function getNextQuestion() {
    for (let i = currentQuestionIndex; i < questions.length; i++) {
        const question = questions[i];
        
        if (question.condition) {
            const lastAnswer = answers.length > 0 ? answers[answers.length - 1].answer : null;
            if (question.condition.previousAnswer !== lastAnswer) {
                continue;
            }
        }
        
        return { question, index: i };
    }
    
    return null;
}

// 답변 처리 (기존 모드용)
function handleAnswer(answer) {
    const question = questions[currentQuestionIndex];
    answers.push({ questionId: question.id, answer });
    
    updateUserPreferences(question, answer);
    
    document.getElementById('questionCharacter').src = 'images/ai_teacher_thinking.png';
    
    // 기존 필터링 로직
    if (question.type === 'yes_no') {
        const filterTags = question.filterLogic[answer] || [];
        if (answer === 'yes' && filterTags.length > 0) {
            remainingTools = remainingTools.filter(tool => 
                tool.tags.some(tag => filterTags.includes(tag))
            );
        } else if (answer === 'no' && filterTags.length > 0) {
            remainingTools = remainingTools.filter(tool => 
                !tool.tags.some(tag => filterTags.includes(tag))
            );
        }
    } else if (question.type === 'category') {
        const filterTags = question.filterLogic.options?.[answer] || [];
        remainingTools = remainingTools.filter(tool => 
            tool.tags.some(tag => filterTags.includes(tag))
        );
    }
    
    currentQuestionIndex++;
    
    setTimeout(() => {
        document.getElementById('questionCharacter').src = 'images/ai_teacher_curious.png';
        showQuestion();
    }, 500);
}

// 사용자 선호도 업데이트
function updateUserPreferences(question, answer) {
    if (question.weightTarget && question.type === 'scale') {
        const scaleValue = (parseInt(answer) - 1) / 4;
        userPreferences[question.weightTarget] = scaleValue;
    } else if (question.weightTarget && question.type === 'yes_no') {
        if (answer === 'yes') {
            userPreferences[question.weightTarget] = Math.min(1, userPreferences[question.weightTarget] + 0.3);
        } else if (answer === 'no') {
            userPreferences[question.weightTarget] = Math.max(0, userPreferences[question.weightTarget] - 0.3);
        }
    }
}

// 진행률 업데이트
function updateProgress() {
    // 기존 진행률 표시 로직
}

// 결과 표시
function showResult() {
    let recommendedTool = null;
    
    if (useAkinatorMode && akinatorEngine) {
        // 아키네이터 모드
        recommendedTool = akinatorEngine.generateRecommendation();
        
        if (!recommendedTool) {
            showScreen('errorScreen');
            return;
        }
    } else {
        // 기존 모드
        if (remainingTools.length === 0) {
            showScreen('errorScreen');
            return;
        }
        
        recommendedTool = remainingTools[0];
    }
    
    document.getElementById('toolName').textContent = recommendedTool.name;
    document.getElementById('toolDescription').textContent = recommendedTool.description;
    
    // 아키네이터 신뢰도 표시 제거 (사용자 요청)
    
    // 추천 이유 표시
    const reasonDiv = document.getElementById('recommendationReason');
    if (reasonDiv) {
        let reasonText = '';
        if (useAkinatorMode && akinatorEngine) {
            reasonText = '답변하신 내용을 분석하여 가장 적합한 AI 도구를 찾았습니다.';
        } else {
            reasonText = '답변하신 내용을 종합하여 가장 적합한 도구로 판단됩니다';
        }
        reasonDiv.innerHTML = `<h4>🎯 추천 이유:</h4><p>${reasonText}</p>`;
    }
    
    // 강점 표시
    const strengthsDiv = document.getElementById('toolStrengths');
    const strengthsTitle = window.i18n ? window.i18n.t('ui.strengths') : '💪 강점';
    strengthsDiv.innerHTML = `<h4>${strengthsTitle}:</h4><ul>` + 
        recommendedTool.strengths.map(strength => `<li>${strength}</li>`).join('') + 
        '</ul>';
    
    // 링크 설정
    const toolLink = document.getElementById('toolLink');
    toolLink.href = recommendedTool.url;
    
    showScreen('resultScreen');
}

// 다시 시작
function restart() {
    if (useAkinatorMode && window.AkinatorEngine) {
        akinatorEngine = new window.AkinatorEngine(tools, akinatorQuestions);
    }
    startQuiz();
}

// 컴포넌트 시스템
function getComponents() {
    return window.AITeacherComponents || {};
}

function createButtonFallback(text, className, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `btn ${className}`;
    btn.onclick = onClick;
    return btn;
}

function getButtonCreator() {
    const { createButton } = getComponents();
    return createButton || createButtonFallback;
}

// 공유 기능
function shareOnTwitter(event) {
    event.preventDefault();
    const tool = akinatorEngine ? akinatorEngine.generateRecommendation() : remainingTools[0];
    if (!tool) return;
    
    const shareText = window.i18n ? window.i18n.t('messages.shareTwitter') : 'AI Teacher가 추천해준 AI 도구:';
    const text = `${shareText} ${tool.name} - ${tool.description}`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

function shareOnFacebook(event) {
    event.preventDefault();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    
    window.addEventListener('languageChanged', () => {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const screenId = activeScreen.id;
            if (screenId === 'questionScreen') {
                if (useAkinatorMode) {
                    showAkinatorQuestion();
                } else {
                    showQuestion();
                }
            } else if (screenId === 'resultScreen') {
                showResult();
            }
        }
    });
    
    const { showToast } = getComponents();
    if (showToast) {
        window.showToast = showToast;
    }
});