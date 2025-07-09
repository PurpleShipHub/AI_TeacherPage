// AI.선생님 Quiz App
let tools = [];
let questions = [];
let currentQuestionIndex = 0;
let answers = [];
let remainingTools = [];

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
        const [toolsResponse, questionsResponse] = await Promise.all([
            fetch('data/tools.json'),
            fetch('data/questions.json')
        ]);
        
        tools = await toolsResponse.json();
        questions = await questionsResponse.json();
        remainingTools = [...tools];
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        const errorMessage = window.i18n ? window.i18n.t('errors.dataLoadFailed') : '데이터를 불러오는데 실패했습니다.';
        alert(errorMessage);
    }
}

// 퀴즈 시작
function startQuiz() {
    // 데이터가 로드되지 않았다면 먼저 로드
    if (!tools || tools.length === 0 || !questions || questions.length === 0) {
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
    
    showQuestion();
    showScreen('questionScreen');
}

// 다음 질문 찾기
function getNextQuestion() {
    for (let i = currentQuestionIndex; i < questions.length; i++) {
        const question = questions[i];
        
        // 조건부 질문 체크
        if (question.condition) {
            const lastAnswer = answers.length > 0 ? answers[answers.length - 1].answer : null;
            if (question.condition.previousAnswer !== lastAnswer) {
                continue; // 조건이 맞지 않으면 다음 질문으로
            }
        }
        
        return { question, index: i };
    }
    
    return null;
}

// 질문 표시
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
    
    // 질문 텍스트 번역
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
    } else if (question.type === 'category' && question.options) {
        answerButtons.classList.add('grid');
        
        const buttonCreator = getButtonCreator();
        question.options.forEach(option => {
            // 옵션 번역 (카테고리 또는 옵션)
            let translatedOption = option;
            if (window.i18n) {
                // 먼저 options에서 찾고, 없으면 categories에서 찾기
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

// 컴포넌트 시스템 사용
function getComponents() {
    return window.AITeacherComponents || {};
}

// 버튼 생성 헬퍼 함수 (fallback)
function createButtonFallback(text, className, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `btn ${className}`;
    btn.onclick = onClick;
    return btn;
}

// createButton 함수 가져오기
function getButtonCreator() {
    const { createButton } = getComponents();
    return createButton || createButtonFallback;
}

// 답변 처리
function handleAnswer(answer) {
    const question = questions[currentQuestionIndex];
    answers.push({ questionId: question.id, answer });
    
    // 캐릭터 이미지 변경 (생각하는 표정)
    document.getElementById('questionCharacter').src = 'images/ai_teacher_thinking.png';
    
    // 필터링 로직
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
    
    // 잠시 후 다음 질문으로
    setTimeout(() => {
        document.getElementById('questionCharacter').src = 'images/ai_teacher_curious.png';
        showQuestion();
    }, 500);
}

// 진행률 업데이트 (제거됨)
function updateProgress() {
    // 진행률 표시 제거
}

// 결과 표시
function showResult() {
    if (remainingTools.length === 0) {
        showScreen('errorScreen');
        return;
    }
    
    const recommendedTool = remainingTools[0];
    
    document.getElementById('toolName').textContent = recommendedTool.name;
    document.getElementById('toolDescription').textContent = recommendedTool.description;
    
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
    startQuiz();
}

// 공유 기능
function shareOnTwitter(event) {
    event.preventDefault();
    const tool = remainingTools[0];
    if (!tool) return;
    
    const shareText = window.i18n ? window.i18n.t('messages.shareTwitter') : 'AI Teacher가 추천해준 AI 도구:';
    const text = `${shareText} ${tool.name} - ${tool.description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

function shareOnFacebook(event) {
    event.preventDefault();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

function shareOnKakao(event) {
    event.preventDefault();
    const tool = remainingTools[0];
    if (!tool) return;
    
    // Kakao SDK가 로드되어 있는지 확인
    if (typeof Kakao === 'undefined') {
        const message = window.i18n ? window.i18n.t('errors.kakaoShareNotReady') : '카카오톡 공유는 준비 중입니다.';
        alert(message);
        return;
    }
    
    const shareTitle = window.i18n ? window.i18n.t('messages.shareKakao') : 'AI Teacher 추천:';
    const buttonText = window.i18n ? window.i18n.t('messages.shareButton') : 'AI Teacher 사용하기';
    
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `${shareTitle} ${tool.name}`,
            description: tool.description,
            imageUrl: window.location.origin + '/images/ai_teacher_explaining.png',
            link: {
                mobileWebUrl: window.location.href,
                webUrl: window.location.href,
            },
        },
        buttons: [
            {
                title: buttonText,
                link: {
                    mobileWebUrl: window.location.href,
                    webUrl: window.location.href,
                },
            },
        ],
    });
}

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
    // 데이터 로드
    await loadData();
    
    // 언어 변경 이벤트 리스너
    window.addEventListener('languageChanged', () => {
        // 현재 화면 다시 렌더링
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const screenId = activeScreen.id;
            if (screenId === 'questionScreen') {
                showQuestion(); // 질문 다시 표시
            } else if (screenId === 'resultScreen') {
                showResult(); // 결과 다시 표시
            }
        }
    });
    
    // showToast 함수 전역 등록
    const { showToast } = getComponents();
    if (showToast) {
        window.showToast = showToast;
    }
});