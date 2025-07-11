// 초고속 아키네이터 엔진
// 통합 데이터베이스를 사용하여 한 번에 로드

class UltraFastAkinator {
    constructor() {
        this.allTools = {};
        this.currentToolIds = new Set();
        this.tagIndex = {};
        this.categoryIndex = {};
        this.pricingIndex = {};
        this.tagCounts = {};
        this.categoryCounts = {};
        this.pricingCounts = {};
        this.usedQuestions = new Set();
        this.questionHistory = [];
        this.currentQuestion = null;
        this.sessionId = null;
        this.totalTools = 0;
    }

    async loadTools() {
        try {
            console.log('UltraFastAkinator: 통합 데이터베이스 로딩 시작...');
            
            // 통합 데이터베이스 한 번에 로드
            const response = await fetch('data/unified_tools.json');
            const database = await response.json();
            
            // 데이터 구조 복사
            this.allTools = database.tools;
            this.tagIndex = database.tag_index;
            this.categoryIndex = database.category_index;
            this.pricingIndex = database.pricing_index;
            this.totalTools = database.metadata.total_tools;
            
            // 초기 카운트는 메타데이터에서 가져오기
            this.tagCounts = database.metadata.tag_counts || {};
            this.categoryCounts = database.metadata.category_counts || {};
            this.pricingCounts = database.metadata.pricing_counts || {};
            
            console.log(`UltraFastAkinator: ${this.totalTools}개 도구 로드 완료`);
            console.log(`태그 ${Object.keys(this.tagCounts).length}개, 카테고리 ${Object.keys(this.categoryCounts).length}개`);
            
            return true;
        } catch (error) {
            console.error('통합 데이터베이스 로드 실패:', error);
            return false;
        }
    }

    startSession() {
        this.sessionId = `session_${Date.now()}`;
        this.currentToolIds = new Set(Object.keys(this.allTools).map(id => parseInt(id)));
        this.usedQuestions.clear();
        this.questionHistory = [];
        this.currentQuestion = null;
        
        // 현재 도구들로 카운트 재계산
        this.updateAllCounts();
        
        console.log(`새 세션 시작: ${this.sessionId}`);
        console.log(`초기 도구: ${this.currentToolIds.size}개`);
        console.log(`초기 태그: ${Object.keys(this.tagCounts).length}개`);
        
        return this.getNextQuestion();
    }

    updateAllCounts() {
        // 현재 활성 도구들에 대해서만 카운트 재계산
        this.tagCounts = {};
        this.categoryCounts = {};
        this.pricingCounts = {};

        for (const toolId of this.currentToolIds) {
            const tool = this.allTools[toolId];
            if (!tool) continue;

            // 태그 카운트
            if (tool.tags && Array.isArray(tool.tags)) {
                for (const tag of tool.tags) {
                    const tagLower = tag.toLowerCase().trim();
                    if (tagLower) {
                        this.tagCounts[tagLower] = (this.tagCounts[tagLower] || 0) + 1;
                    }
                }
            }

            // 카테고리 카운트
            if (tool.category) {
                const category = tool.category.toLowerCase().trim();
                this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;
            }

            // 가격 카운트
            if (tool.pricing && tool.pricing.type) {
                const pricing = tool.pricing.type.toLowerCase().trim();
                this.pricingCounts[pricing] = (this.pricingCounts[pricing] || 0) + 1;
            }
        }

        console.log(`카운트 업데이트: 태그 ${Object.keys(this.tagCounts).length}개, 카테고리 ${Object.keys(this.categoryCounts).length}개, 가격 ${Object.keys(this.pricingCounts).length}개`);
    }

    getNextQuestion() {
        if (this.currentToolIds.size <= 5) {
            return null; // 5개 이하면 결과 화면으로
        }

        // 가장 높은 카운트의 질문 찾기
        const candidates = [];

        // 1. 태그 기반 질문
        for (const [tag, count] of Object.entries(this.tagCounts)) {
            const questionId = `tag:${tag}`;
            if (!this.usedQuestions.has(questionId) && count > 1 && count < this.currentToolIds.size) {
                candidates.push({
                    id: questionId,
                    type: 'tag',
                    value: tag,
                    question: this.generateTagQuestion(tag),
                    count: count
                });
            }
        }

        // 2. 카테고리 기반 질문
        for (const [category, count] of Object.entries(this.categoryCounts)) {
            const questionId = `category:${category}`;
            if (!this.usedQuestions.has(questionId) && count > 1 && count < this.currentToolIds.size) {
                candidates.push({
                    id: questionId,
                    type: 'category',
                    value: category,
                    question: this.generateCategoryQuestion(category),
                    count: count
                });
            }
        }

        // 3. 가격 기반 질문
        for (const [pricing, count] of Object.entries(this.pricingCounts)) {
            const questionId = `pricing:${pricing}`;
            if (!this.usedQuestions.has(questionId) && count > 1 && count < this.currentToolIds.size) {
                candidates.push({
                    id: questionId,
                    type: 'pricing',
                    value: pricing,
                    question: this.generatePricingQuestion(pricing),
                    count: count
                });
            }
        }

        // 카운트가 가장 높은 질문 선택
        if (candidates.length > 0) {
            const bestQuestion = candidates.reduce((best, current) => 
                current.count > best.count ? current : best
            );
            
            this.currentQuestion = bestQuestion;
            this.usedQuestions.add(bestQuestion.id);
            
            console.log(`다음 질문: ${bestQuestion.question} (${bestQuestion.count}개 도구)`);
            return bestQuestion.question;
        }

        return null;
    }

    answerQuestion(answer) {
        if (!this.currentQuestion) {
            return { result: 'error', message: '현재 질문이 없습니다' };
        }

        const candidatesBefore = this.currentToolIds.size;
        const binaryAnswer = this.convertToBinary(answer);
        
        console.log(`답변 처리: ${answer} (${binaryAnswer}) - 현재 도구 ${candidatesBefore}개`);

        // 답변에 따라 도구 필터링
        const filteredToolIds = this.filterTools(binaryAnswer);
        
        // 도구 목록 업데이트
        this.currentToolIds = filteredToolIds;
        this.updateAllCounts(); // 전체 카운트 재계산
        
        // 질문 기록
        this.questionHistory.push({
            question: this.currentQuestion.question,
            answer: answer,
            before: candidatesBefore,
            after: this.currentToolIds.size,
            questionType: this.currentQuestion.type,
            questionValue: this.currentQuestion.value
        });

        console.log(`필터링 완료: ${candidatesBefore} → ${this.currentToolIds.size}`);

        // 결과 확인
        if (this.currentToolIds.size === 0) {
            return { result: 'no_match', message: '조건에 맞는 도구를 찾지 못했습니다' };
        }

        if (this.currentToolIds.size === 1) {
            const toolId = Array.from(this.currentToolIds)[0];
            return { 
                result: 'success', 
                tool: this.allTools[toolId],
                questionsAsked: this.questionHistory.length,
                sessionId: this.sessionId
            };
        }

        if (this.currentToolIds.size <= 5) {
            const tools = Array.from(this.currentToolIds).map(id => this.allTools[id]);
            return { 
                result: 'final_candidates', 
                tools: tools,
                questionsAsked: this.questionHistory.length,
                sessionId: this.sessionId
            };
        }

        // 다음 질문 생성
        const nextQuestion = this.getNextQuestion();
        if (nextQuestion) {
            return { 
                result: 'continue', 
                question: nextQuestion,
                remaining: this.currentToolIds.size,
                sessionId: this.sessionId
            };
        } else {
            // 더 이상 질문할 게 없으면 현재 상위 도구들 반환
            const tools = Array.from(this.currentToolIds).slice(0, 5).map(id => this.allTools[id]);
            return { 
                result: 'final_candidates', 
                tools: tools,
                questionsAsked: this.questionHistory.length,
                sessionId: this.sessionId
            };
        }
    }

    filterTools(binaryAnswer) {
        const question = this.currentQuestion;
        const filtered = new Set();

        for (const toolId of this.currentToolIds) {
            const tool = this.allTools[toolId];
            if (!tool) continue;

            let matches = false;

            if (question.type === 'tag') {
                const toolTags = (tool.tags || []).map(tag => tag.toLowerCase());
                matches = toolTags.includes(question.value);
            } else if (question.type === 'category') {
                const toolCategory = (tool.category || '').toLowerCase();
                matches = toolCategory === question.value;
            } else if (question.type === 'pricing') {
                const toolPricing = tool.pricing ? tool.pricing.type.toLowerCase() : '';
                matches = toolPricing === question.value;
            }

            // YES면 매칭되는 것만, NO면 매칭되지 않는 것만
            if ((binaryAnswer === 'yes' && matches) || (binaryAnswer === 'no' && !matches)) {
                filtered.add(toolId);
            }
        }

        return filtered;
    }

    convertToBinary(answer) {
        const mapping = {
            'yes': 'yes',
            'probably': 'yes',
            'maybe': 'yes',
            'probably_not': 'no',
            'no': 'no',
            'unknown': 'no'
        };
        return mapping[answer] || 'no';
    }

    generateTagQuestion(tag) {
        const templates = {
            'ai': 'AI 기능이 필요하신가요?',
            'free': '무료로 사용할 수 있는 도구를 원하시나요?',
            'automation': '자동화 기능을 원하시나요?',
            'chatbot': 'AI 챗봇 기능이 필요하신가요?',
            'writing': 'AI 글쓰기 도구가 필요하신가요?',
            'image': '이미지 관련 기능을 원하시나요?',
            'video': '비디오 처리 기능이 필요하신가요?',
            'api': 'API 연동이 가능한 도구를 원하시나요?',
            'business': '비즈니스용 도구를 찾고 계신가요?',
            'productivity': '생산성 도구를 원하시나요?',
            'marketing': '마케팅 도구가 필요하신가요?',
            'assistant': 'AI 어시스턴트를 찾고 계신가요?',
            'generator': '생성형 AI 도구를 원하시나요?',
            'summarizer': '요약 기능이 필요하신가요?',
            'translator': '번역 기능을 원하시나요?',
            'content': '콘텐츠 제작 도구가 필요하신가요?',
            'design': '디자인 도구를 원하시나요?',
            'analytics': '분석 도구가 필요하신가요?',
            'social': '소셜 미디어 관련 도구를 찾고 계신가요?',
            'developer': '개발자 도구를 찾고 계신가요?',
            'education': '교육용 도구를 원하시나요?',
            'healthcare': '의료/건강 관련 도구를 찾고 계신가요?',
            'finance': '금융 관련 도구를 원하시나요?',
            'customer': '고객 서비스 도구를 찾고 계신가요?',
            'sales': '영업 도구가 필요하신가요?'
        };

        for (const [pattern, template] of Object.entries(templates)) {
            if (tag.includes(pattern)) {
                return template;
            }
        }

        return `${tag} 기능이 필요하신가요?`;
    }

    generateCategoryQuestion(category) {
        const categoryNames = {
            'ai-assistant': 'AI 어시스턴트',
            'ai-chatbot': 'AI 챗봇',
            'ai-image-generator': 'AI 이미지 생성',
            'ai-writing-assistants': 'AI 글쓰기',
            'ai-video-generator': 'AI 비디오 생성',
            'ai-productivity-tools': 'AI 생산성',
            'ai-developer-tools': 'AI 개발자',
            'ai-marketing': 'AI 마케팅',
            'ai-agent': 'AI 에이전트',
            'ai-copilot': 'AI 코파일럿',
            'ai-summarizer': 'AI 요약',
            'other': '기타'
        };

        const categoryName = categoryNames[category] || category;
        return `${categoryName} 관련 도구를 찾고 계신가요?`;
    }

    generatePricingQuestion(pricing) {
        const pricingQuestions = {
            'free': '무료로 사용할 수 있는 도구를 원하시나요?',
            'freemium': '기본 무료, 프리미엄 유료 서비스를 원하시나요?',
            'paid': '유료 서비스를 이용하실 의향이 있으신가요?',
            'subscription': '월 구독형 서비스를 원하시나요?',
            'one-time': '일회성 구매를 선호하시나요?',
            'enterprise': '기업용 솔루션을 찾고 계신가요?',
            'contact': '가격 문의가 필요한 도구도 괜찮으신가요?'
        };

        return pricingQuestions[pricing] || `${pricing} 가격 모델을 선호하시나요?`;
    }

    // 외부 호환성을 위한 메서드들
    restart() {
        return this.startSession();
    }

    processAnswer(answer) {
        const result = this.answerQuestion(answer);
        return result.result === 'continue';
    }

    getCurrentQuestion() {
        return this.currentQuestion ? {
            text: this.currentQuestion.question,
            id: this.currentQuestion.id,
            type: this.currentQuestion.type
        } : null;
    }

    isLeafNode() {
        return this.currentToolIds.size <= 5;
    }

    getFinalResults() {
        // 현재 도구들을 배열로 변환
        const currentTools = Array.from(this.currentToolIds).map(id => this.allTools[id]).filter(tool => tool);
        
        // 인기도 순으로 정렬
        const sortedTools = currentTools.sort((a, b) => {
            const scoreA = (a.monthly_visits || 0) + (a.rating || 0) * 1000;
            const scoreB = (b.monthly_visits || 0) + (b.rating || 0) * 1000;
            return scoreB - scoreA;
        });

        return {
            recommendations: sortedTools,
            searchSummary: {
                questionsAsked: this.questionHistory.length,
                startingTools: this.totalTools,
                finalCandidates: this.currentToolIds.size
            }
        };
    }

    getDiagnostics() {
        const topTags = Object.entries(this.tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([tag, count]) => `${tag}(${count})`)
            .join(', ');

        return {
            activeCandidates: this.currentToolIds.size,
            questionsAsked: this.questionHistory.length,
            usedQuestions: this.usedQuestions.size,
            totalTools: this.totalTools,
            topTags: topTags,
            totalTags: Object.keys(this.tagCounts).length,
            sessionId: this.sessionId
        };
    }
}

export { UltraFastAkinator };