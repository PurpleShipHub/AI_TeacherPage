// AI Teacher Quiz App
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
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 퀴즈 시작
function startQuiz() {
    currentQuestionIndex = 0;
    answers = [];
    remainingTools = [...tools];
    showQuestion();
    showScreen('questionScreen');
}

// 질문 표시
function showQuestion() {
    if (currentQuestionIndex >= questions.length || remainingTools.length <= 1) {
        showResult();
        return;
    }
    
    const question = questions[currentQuestionIndex];
    document.getElementById('questionText').textContent = question.text;
    
    const answerButtons = document.getElementById('answerButtons');
    answerButtons.innerHTML = '';
    
    if (question.type === 'yes_no') {
        answerButtons.classList.remove('grid');
        
        const yesBtn = createButton('네', 'btn-yes', () => handleAnswer('yes'));
        const noBtn = createButton('아니요', 'btn-no', () => handleAnswer('no'));
        const unknownBtn = createButton('모름', 'btn-unknown', () => handleAnswer('unknown'));
        
        answerButtons.appendChild(yesBtn);
        answerButtons.appendChild(noBtn);
        answerButtons.appendChild(unknownBtn);
    } else if (question.type === 'category' && question.options) {
        answerButtons.classList.add('grid');
        
        question.options.forEach(option => {
            const btn = createButton(option, 'btn-primary', () => handleAnswer(option));
            answerButtons.appendChild(btn);
        });
    }
    
    updateProgress();
}

// 버튼 생성 헬퍼 함수
function createButton(text, className, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `btn ${className}`;
    btn.onclick = onClick;
    return btn;
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

// 진행률 업데이트
function updateProgress() {
    const progress = Math.round((currentQuestionIndex / questions.length) * 100);
    document.getElementById('progressPercent').textContent = progress;
    document.getElementById('remainingCount').textContent = remainingTools.length;
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
    strengthsDiv.innerHTML = '<h4>💪 강점:</h4><ul>' + 
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

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});