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
        this.questions = []; // 질문 데이터
        this.questionsByType = {}; // 타입별 질문 인덱스
        this.recentQuestionTexts = []; // 최근 질문 텍스트 추적
        this.excludedTags = []; // 제외할 태그 목록 (동적 로드)
    }

    async loadTools() {
        try {
            console.log('UltraFastAkinator: 통합 데이터베이스 로딩 시작...');
            
            // 제외할 태그 목록 로드
            try {
                const excludedResponse = await fetch('data/excluded_tags.json');
                if (excludedResponse.ok) {
                    this.excludedTags = await excludedResponse.json();
                    console.log(`제외할 태그 ${this.excludedTags.length}개 로드됨`);
                }
            } catch (error) {
                console.warn('제외 태그 로드 실패, 기본값 사용:', error);
                // 기본 제외 태그 설정
                this.excludedTags = ['ai', 'ai-tools', 'artificial-intelligence', 'machine-learning'];
            }
            
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
            
            // 질문 데이터 로드
            try {
                const questionsResponse = await fetch('data/questions_ko.json');
                if (questionsResponse.ok) {
                    this.questions = await questionsResponse.json();
                    
                    // 타입별로 질문 인덱싱
                    this.questionsByType = {
                        'tag': {},
                        'category': {},
                        'pricing': {},
                        'feature': {}
                    };
                    
                    for (const question of this.questions) {
                        if (question.type && question.value) {
                            if (!this.questionsByType[question.type]) {
                                this.questionsByType[question.type] = {};
                            }
                            this.questionsByType[question.type][question.value.toLowerCase()] = question;
                        }
                    }
                    
                    console.log(`질문 ${this.questions.length}개 로드 완료`);
                }
            } catch (error) {
                console.warn('질문 데이터 로드 실패, 기본 질문 사용:', error);
            }
            
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

        // 1. 태그 기반 질문 (가장 많은 태그부터)
        const sortedTags = Object.entries(this.tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 100); // 상위 100개 태그만

        for (const [tag, count] of sortedTags) {
            // 제외된 태그는 건너뛰기
            if (this.excludedTags.includes(tag.toLowerCase())) {
                continue;
            }
            
            const questionId = `tag:${tag}`;
            if (!this.usedQuestions.has(questionId) && count > 1 && count < this.currentToolIds.size) {
                // 데이터베이스에서 질문 찾기
                const dbQuestion = this.questionsByType['tag'] && this.questionsByType['tag'][tag];
                const questionText = dbQuestion ? dbQuestion.question : this.generateTagQuestion(tag);
                
                candidates.push({
                    id: questionId,
                    type: 'tag',
                    value: tag,
                    question: questionText,
                    count: count,
                    score: count / this.currentToolIds.size,
                    weight: dbQuestion ? (dbQuestion.weight || 1.0) : 1.0
                });
            }
        }

        // 2. 카테고리 기반 질문
        const sortedCategories = Object.entries(this.categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20); // 상위 20개 카테고리만

        for (const [category, count] of sortedCategories) {
            const questionId = `category:${category}`;
            if (!this.usedQuestions.has(questionId) && count > 1 && count < this.currentToolIds.size) {
                const dbQuestion = this.questionsByType['category'] && this.questionsByType['category'][category];
                const questionText = dbQuestion ? dbQuestion.question : this.generateCategoryQuestion(category);
                
                candidates.push({
                    id: questionId,
                    type: 'category',
                    value: category,
                    question: questionText,
                    count: count,
                    score: count / this.currentToolIds.size,
                    weight: dbQuestion ? (dbQuestion.weight || 1.0) : 1.0
                });
            }
        }

        // 3. 가격 기반 질문 (한정적으로 사용)
        if (this.questionHistory.length > 3) { // 3개 이상 질문 후에만
            for (const [pricing, count] of Object.entries(this.pricingCounts)) {
                const questionId = `pricing:${pricing}`;
                if (!this.usedQuestions.has(questionId) && count > 1 && count < this.currentToolIds.size) {
                    const dbQuestion = this.questionsByType['pricing'] && this.questionsByType['pricing'][pricing];
                    const questionText = dbQuestion ? dbQuestion.question : this.generatePricingQuestion(pricing);
                    
                    candidates.push({
                        id: questionId,
                        type: 'pricing',
                        value: pricing,
                        question: questionText,
                        count: count,
                        score: count / this.currentToolIds.size,
                        weight: dbQuestion ? (dbQuestion.weight || 1.0) : 0.8 // 가격 질문은 가중치 낮춤
                    });
                }
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        // 유사한 질문 필터링
        const filteredCandidates = this.filterSimilarQuestions(candidates);

        if (filteredCandidates.length === 0) {
            // 모든 질문이 필터링되었다면 원본에서 선택
            filteredCandidates.push(...candidates.slice(0, 5));
        }

        // 최적의 질문 선택 (균형잡힌 분할 + 가중치 고려)
        const bestQuestion = filteredCandidates.reduce((best, current) => {
            // 50/50 분할에 가까울수록 높은 점수
            const bestSplitScore = 1 - Math.abs(0.5 - best.score);
            const currentSplitScore = 1 - Math.abs(0.5 - current.score);
            
            // 최종 점수 = 분할 점수 * 가중치
            const bestFinalScore = bestSplitScore * best.weight;
            const currentFinalScore = currentSplitScore * current.weight;
            
            // 높은 점수 선택
            if (currentFinalScore > bestFinalScore) {
                return current;
            } else if (Math.abs(currentFinalScore - bestFinalScore) < 0.1) {
                // 비슷한 경우 카운트가 높은 것 선택
                return current.count > best.count ? current : best;
            }
            return best;
        });
        
        this.currentQuestion = bestQuestion;
        this.usedQuestions.add(bestQuestion.id);
        this.recentQuestionTexts.push(bestQuestion.question);
        
        // 최근 질문 텍스트 제한
        if (this.recentQuestionTexts.length > 5) {
            this.recentQuestionTexts.shift();
        }
        
        console.log(`다음 질문: ${bestQuestion.question} (${bestQuestion.count}개 도구, 효율성: ${(bestQuestion.score * 100).toFixed(1)}%)`);
        return bestQuestion.question;
    }

    filterSimilarQuestions(candidates) {
        if (this.recentQuestionTexts.length === 0) {
            return candidates;
        }

        return candidates.filter(candidate => {
            const questionText = candidate.question.toLowerCase();
            
            // 정확히 같은 질문 제외
            if (this.recentQuestionTexts.some(recent => recent.toLowerCase() === questionText)) {
                return false;
            }
            
            // 최근 질문과 너무 유사한지 확인
            for (const recentText of this.recentQuestionTexts) {
                const recent = recentText.toLowerCase();
                
                // 주요 키워드 중복 확인
                const recentKeywords = recent.match(/[가-힣]+/g) || [];
                const candidateKeywords = questionText.match(/[가-힣]+/g) || [];
                
                // 공통 키워드 비율 계산
                const commonKeywords = recentKeywords.filter(k => 
                    candidateKeywords.includes(k) && k.length > 2
                ).length;
                
                const similarity = commonKeywords / Math.min(recentKeywords.length, candidateKeywords.length);
                
                if (similarity > 0.6) {
                    return false; // 60% 이상 유사하면 제외
                }
            }
            
            return true;
        });
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
            'no': 'no',
            'unknown': 'no'  // 잘 모르겠다면 해당 조건으로 필터링하지 않음
        };
        return mapping[answer] || 'no';
    }

    generateTagQuestion(tag) {
        // 다양한 질문 패턴
        const questionPatterns = [
            `{tag} 기능이 있는 도구를 원하시나요?`,
            `{tag} 관련 작업을 하실 예정인가요?`,
            `{tag}을(를) 활용하고 싶으신가요?`,
            `{tag} 도구가 도움이 될까요?`,
            `{tag} 기능이 중요하신가요?`
        ];
        
        // 특별한 태그에 대한 맞춤 질문
        const customTemplates = {
            // AI 도구 사이트이므로 'ai' 태그 질문은 제거
            'free': ['무료로 시작하고 싶으신가요?', '비용 부담 없이 사용하고 싶으신가요?', '무료 도구를 우선적으로 찾으시나요?'],
            'automation': ['자동화 기능이 필요하신가요?', '반복 작업을 줄이고 싶으신가요?', '작업을 자동으로 처리하고 싶으신가요?'],
            'chatbot': ['대화형 인터페이스를 선호하시나요?', '챗봇 기능이 도움이 될까요?', 'AI와 대화하며 작업하고 싶으신가요?'],
            'writing': ['글쓰기 작업이 많으신가요?', '콘텐츠 작성에 도움이 필요하신가요?', '글쓰기 도구를 찾고 계신가요?'],
            'image': ['이미지 작업이 필요하신가요?', '시각적 콘텐츠를 다루시나요?', '그림이나 사진 편집이 필요하신가요?'],
            'video': ['동영상 콘텐츠를 만드시나요?', '비디오 편집이 필요하신가요?', '영상 작업을 하실 예정인가요?'],
            'api': ['다른 서비스와 연동이 필요하신가요?', 'API 통합이 중요하신가요?', '프로그래밍 연동이 필요하신가요?'],
            'business': ['비즈니스 용도로 사용하실 건가요?', '업무에 활용하실 도구인가요?', '회사에서 사용하실 예정인가요?'],
            'productivity': ['생산성 향상이 목표인가요?', '업무 효율을 높이고 싶으신가요?', '시간 절약이 중요하신가요?'],
            'marketing': ['마케팅 활동을 하고 계신가요?', '홍보나 광고가 필요하신가요?', '고객 유치가 목표인가요?'],
            'assistant': ['개인 비서 같은 도구를 원하시나요?', '다양한 작업을 도와줄 도구가 필요하신가요?', 'AI 어시스턴트를 찾고 계신가요?'],
            'generator': ['콘텐츠 생성이 주 목적인가요?', '자동 생성 기능이 필요하신가요?', '새로운 콘텐츠를 만들고 싶으신가요?'],
            'summarizer': ['요약 기능이 필요하신가요?', '긴 내용을 간단히 정리하고 싶으신가요?', '핵심만 빠르게 파악하고 싶으신가요?'],
            'translator': ['번역 기능이 필요하신가요?', '다국어 지원이 중요하신가요?', '언어 장벽을 해결하고 싶으신가요?'],
            'content': ['콘텐츠 제작이 주 목적인가요?', '창의적인 콘텐츠를 만들고 싶으신가요?', '콘텐츠 관리가 필요하신가요?'],
            'design': ['디자인 작업을 하시나요?', '시각적 디자인이 중요하신가요?', '창의적인 디자인이 필요하신가요?'],
            'analytics': ['데이터 분석이 필요하신가요?', '인사이트를 얻고 싶으신가요?', '통계와 분석이 중요하신가요?'],
            'social': ['소셜 미디어를 관리하시나요?', 'SNS 마케팅이 필요하신가요?', '소셜 미디어 활동이 많으신가요?'],
            'developer': ['개발 작업을 하시나요?', '프로그래밍 도구가 필요하신가요?', '코딩 작업이 많으신가요?'],
            'education': ['교육 목적으로 사용하실 건가요?', '학습 도구가 필요하신가요?', '교육 콘텐츠를 만드시나요?'],
            'healthcare': ['헬스케어 분야에서 사용하실 건가요?', '건강 관리가 목적인가요?', '의료 관련 작업을 하시나요?'],
            'finance': ['금융 관련 작업을 하시나요?', '재무 관리가 필요하신가요?', '금융 데이터를 다루시나요?'],
            'customer': ['고객 서비스가 중요하신가요?', '고객 관리 도구가 필요하신가요?', '고객 응대를 개선하고 싶으신가요?'],
            'sales': ['판매 활동을 하고 계신가요?', '영업 도구가 필요하신가요?', '매출 향상이 목표인가요?']
        };

        // 특별한 태그에 맞춤 질문이 있는지 확인
        for (const [pattern, questions] of Object.entries(customTemplates)) {
            if (tag.toLowerCase().includes(pattern)) {
                // 사용하지 않은 질문 선택
                const unusedQuestions = questions.filter(q => 
                    !this.recentQuestionTexts.includes(q)
                );
                
                if (unusedQuestions.length > 0) {
                    return unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
                } else {
                    // 모든 질문을 사용했다면 랜덤 선택
                    return questions[Math.floor(Math.random() * questions.length)];
                }
            }
        }

        // 일반 패턴 사용
        const pattern = questionPatterns[Math.floor(Math.random() * questionPatterns.length)];
        return pattern.replace('{tag}', tag);
    }

    generateCategoryQuestion(category) {
        const categoryQuestions = {
            'ai-assistant': '개인 비서처럼 여러 가지 일을 도와주는 도구가 필요하세요?',
            'ai-chatbot': '채팅으로 대화할 수 있는 로봇 도구가 필요하세요?',
            'ai-image-generator': '사진이나 그림을 자동으로 만들어주는 도구가 필요하세요?',
            'ai-writing-assistants': '글쓰기를 도와주는 도구가 필요하세요?',
            'ai-video-generator': '동영상을 자동으로 만들어주는 도구가 필요하세요?',
            'ai-productivity-tools': '일을 더 빠르고 효율적으로 할 수 있게 도와주는 도구가 필요하세요?',
            'ai-developer-tools': '프로그래밍이나 개발 업무에 도움이 되는 도구가 필요하세요?',
            'ai-marketing': '상품이나 서비스를 홍보하는 데 도움이 되는 도구가 필요하세요?',
            'ai-agent': '자동으로 업무를 처리해주는 똑똑한 도구가 필요하세요?',
            'ai-copilot': '업무를 함께 도와주는 AI 파트너가 필요하세요?',
            'ai-summarizer': '긴 글을 짧게 요약해주는 도구가 필요하세요?',
            'other': '특별한 기능이 있는 도구를 찾고 계세요?'
        };

        return categoryQuestions[category] || `${category} 관련 도구를 찾고 계세요?`;
    }

    generatePricingQuestion(pricing) {
        const pricingQuestions = {
            'free': '완전 무료로 사용할 수 있는 도구를 찾고 계세요?',
            'freemium': '기본 기능은 무료, 고급 기능은 유료인 도구를 찾고 계세요?',
            'paid': '돈을 지불하고 사용하는 도구도 괜찮으세요?',
            'subscription': '매월 일정 금액을 내고 사용하는 도구를 찾고 계세요?',
            'one-time': '한 번만 구매하면 계속 사용할 수 있는 도구를 선호하세요?',
            'enterprise': '회사나 팀에서 사용할 수 있는 전문 도구를 찾고 계세요?',
            'contact': '가격을 직접 문의해야 하는 도구도 괜찮으세요?',
            'contact-for-pricing': '가격을 직접 문의해야 하는 도구도 괜찮으세요?',
            'free-trial': '무료 체험 기간이 있는 도구를 찾고 계세요?'
        };

        return pricingQuestions[pricing] || `${pricing} 방식의 가격 체계를 선호하세요?`;
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