/**
 * AI Tool Finder - 정보이론 기반 질문 선택 알고리즘
 * Shannon Entropy를 사용하여 최적의 질문을 선택합니다.
 */

export class AIToolFinder {
    constructor(tools) {
        this.allTools = tools;
        this.candidates = [...tools];
        this.usedQuestions = new Set();
        this.answers = [];
    }

    /**
     * Shannon entropy 계산
     * H(S) = -Σ p(x) * log2(p(x))
     */
    calculateEntropy(toolSet) {
        if (!toolSet || toolSet.length === 0) return 0;
        
        const total = this.candidates.length;
        const p = toolSet.length / total;
        
        if (p === 0 || p === 1) return 0;
        
        return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    }

    /**
     * 특정 태그에 대한 정보 이득 계산
     * IG(S, tag) = H(S) - H(S|tag)
     */
    calculateInfoGain(tag) {
        const hasTag = this.candidates.filter(tool => 
            tool.tags && tool.tags.includes(tag)
        );
        const noTag = this.candidates.filter(tool => 
            !tool.tags || !tool.tags.includes(tag)
        );

        const totalEntropy = this.calculateEntropy(this.candidates);
        const hasTagRatio = hasTag.length / this.candidates.length;
        const noTagRatio = noTag.length / this.candidates.length;

        const conditionalEntropy = 
            hasTagRatio * this.calculateEntropy(hasTag) +
            noTagRatio * this.calculateEntropy(noTag);

        return totalEntropy - conditionalEntropy;
    }

    /**
     * 모든 가능한 태그 추출
     */
    getAllTags() {
        const tagSet = new Set();
        this.candidates.forEach(tool => {
            if (tool.tags) {
                tool.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet);
    }

    /**
     * 다음 질문을 위한 최적의 태그 선택 (Akinator 스타일)
     */
    getNextQuestion() {
        if (this.candidates.length <= 3) return null;

        const allTags = this.getAllTags();
        let bestTag = '';
        let bestScore = -Infinity;

        for (const tag of allTags) {
            // 이미 사용한 질문은 제외
            if (this.usedQuestions.has(tag)) continue;

            const score = this.calculateAkinatorScore(tag);
            
            if (score > bestScore) {
                bestScore = score;
                bestTag = tag;
            }
        }

        if (bestTag) {
            this.usedQuestions.add(bestTag);
        }

        return bestTag || null;
    }

    /**
     * Akinator 스타일 점수 계산
     * 균형을 최우선으로 하여 50:50 분할에 가까운 질문 선택
     */
    calculateAkinatorScore(tag) {
        const hasTag = this.candidates.filter(t => t.tags && t.tags.includes(tag));
        const noTag = this.candidates.filter(t => !t.tags || !t.tags.includes(tag));

        if (hasTag.length === 0 || noTag.length === 0) return 0;

        // 분할 비율 계산 (0.5에 가까울수록 좋음)
        const splitRatio = hasTag.length / this.candidates.length;
        
        // 균형 점수 (50:50에 가까울수록 1에 가까워짐)
        // 0.5에서 멀어질수록 급격히 감소하는 가우시안 함수 사용
        const balance = Math.exp(-Math.pow(splitRatio - 0.5, 2) / 0.05);
        
        // 최소 분할 크기 보장 (너무 작은 그룹을 만들지 않도록)
        const minGroupSize = Math.min(hasTag.length, noTag.length);
        const minSizeBonus = minGroupSize >= 5 ? 1 : minGroupSize / 5;
        
        // 정보 이득도 고려하되, 균형이 더 중요
        const infoGain = this.calculateInfoGain(tag);
        
        // 최종 점수: 균형을 최우선으로
        return balance * minSizeBonus * (0.3 + 0.7 * infoGain);
    }

    /**
     * 사용자 답변 처리 (Akinator 스타일 퍼지 로직)
     */
    answer(tag, response) {
        this.answers.push({ tag, response });

        if (response === 'yes') {
            // 확실한 예 - 해당 태그가 있는 도구만 남김
            this.candidates = this.candidates.filter(tool => 
                tool.tags && tool.tags.includes(tag)
            );
        } else if (response === 'no') {
            // 확실한 아니오 - 해당 태그가 없는 도구만 남김
            this.candidates = this.candidates.filter(tool => 
                !tool.tags || !tool.tags.includes(tag)
            );
        } else if (response === 'probably') {
            // 아마도 - 해당 태그가 있는 도구에 가중치 부여
            this.candidates.forEach(tool => {
                if (tool.tags && tool.tags.includes(tag)) {
                    tool._akinatorScore = (tool._akinatorScore || 1) * 1.5;
                } else {
                    tool._akinatorScore = (tool._akinatorScore || 1) * 0.8;
                }
            });
        } else if (response === 'probably_not') {
            // 아마도 아니오 - 해당 태그가 없는 도구에 가중치 부여
            this.candidates.forEach(tool => {
                if (tool.tags && tool.tags.includes(tag)) {
                    tool._akinatorScore = (tool._akinatorScore || 1) * 0.8;
                } else {
                    tool._akinatorScore = (tool._akinatorScore || 1) * 1.2;
                }
            });
        }
        // 'unknown'인 경우 필터링하지 않음
        
        // 점수 기반 정렬
        this.candidates.sort((a, b) => (b._akinatorScore || 1) - (a._akinatorScore || 1));
    }

    /**
     * 현재 후보 도구들 반환
     */
    getCandidates() {
        return this.candidates;
    }

    /**
     * 추천 신뢰도 계산 (Akinator 스타일)
     */
    getConfidence() {
        if (this.candidates.length === 0) return 0;
        if (this.candidates.length === 1) return 1;
        
        // 후보가 적을수록 신뢰도 높음
        const totalQuestions = this.answers.length;
        const remainingRatio = this.candidates.length / this.allTools.length;
        
        // 확실한 답변 비율 계산
        const definiteAnswers = this.answers.filter(a => a.response === 'yes' || a.response === 'no').length;
        const certaintyRatio = definiteAnswers / Math.max(1, totalQuestions);
        
        // 최고 점수 도구와의 차이 계산
        const topScore = this.candidates[0]._akinatorScore || 1;
        const secondScore = this.candidates[1] ? (this.candidates[1]._akinatorScore || 1) : 0;
        const scoreDiff = topScore - secondScore;
        
        return Math.max(0, 1 - remainingRatio) * certaintyRatio * Math.min(1, scoreDiff);
    }

    /**
     * 결과를 보여줄 시점인지 판단
     */
    shouldShowResults() {
        if (this.candidates.length <= 3) return true;
        if (this.candidates.length <= 10 && this.answers.length >= 5) return true;
        if (this.getConfidence() > 0.8) return true;
        return false;
    }

    /**
     * 상태 초기화
     */
    reset() {
        this.candidates = [...this.allTools];
        this.usedQuestions.clear();
        this.answers = [];
    }

    /**
     * 태그를 사용자 친화적인 질문으로 변환
     */
    tagToQuestion(tag) {
        // 태그 타입별 질문 템플릿
        const questionTemplates = {
            // 기능 관련
            'features-': '다음 기능이 필요하신가요: {feature}?',
            // 사용 사례
            'usecase-': '{usecase}에 사용하실 예정인가요?',
            // 가격 관련
            'pricing-': '{pricing} 모델을 선호하시나요?',
            // 플랫폼
            'platform-': '{platform}에서 사용하실 예정인가요?',
            // 기술/산업
            'industry-': '{industry} 분야에서 사용하실 예정인가요?',
            // AI 타입
            'ai-type-': '{aitype} 기능이 필요하신가요?',
            // 사용자 타입
            'user-type-': '{usertype}이신가요?'
        };

        // 태그에서 카테고리와 값 추출
        for (const [prefix, template] of Object.entries(questionTemplates)) {
            if (tag.startsWith(prefix)) {
                const value = tag.substring(prefix.length).replace(/-/g, ' ');
                const placeholder = template.match(/\{(\w+)\}/)[1];
                return template.replace(`{${placeholder}}`, value);
            }
        }

        // 기본 질문 형식
        return `${tag.replace(/-/g, ' ')} 기능이 필요하신가요?`;
    }

    /**
     * 디버그 정보 출력
     */
    getDebugInfo() {
        return {
            totalTools: this.allTools.length,
            remainingCandidates: this.candidates.length,
            questionsAsked: this.answers.length,
            usedQuestions: Array.from(this.usedQuestions),
            confidence: this.getConfidence(),
            topCandidates: this.candidates.slice(0, 3).map(tool => ({
                name: tool.name,
                score: tool._akinatorScore || 1
            }))
        };
    }

    /**
     * 검색 효율성 정보
     */
    getDiagnostics() {
        const reductionRatio = ((this.allTools.length - this.candidates.length) / this.allTools.length * 100).toFixed(1);
        
        return {
            totalTools: this.allTools.length,
            remainingCandidates: this.candidates.length,
            questionsAsked: this.answers.length,
            confidence: this.getConfidence(),
            reductionRatio: `${reductionRatio}%`,
            shouldShowResults: this.shouldShowResults()
        };
    }

    /**
     * 검색 요약 정보
     */
    getSearchSummary() {
        return {
            startingTools: this.allTools.length,
            finalCandidates: this.candidates.length,
            questionsAsked: this.answers.length,
            confidence: this.getConfidence(),
            efficiency: this.answers.length > 0 ? (this.allTools.length / this.candidates.length) / this.answers.length : 0
        };
    }
}

/**
 * 태그 추천 시스템 - 도구 설명을 분석하여 태그 제안
 */
export class TagSuggester {
    constructor() {
        // 키워드 기반 태그 매핑
        this.keywordToTags = {
            // AI 타입
            'chat': ['ai-type-conversational', 'ai-type-nlp'],
            'image': ['ai-type-image-generation', 'ai-type-computer-vision'],
            'code': ['ai-type-code-generation', 'usecase-development'],
            'writing': ['ai-type-text-generation', 'usecase-content-creation'],
            'voice': ['ai-type-speech', 'ai-type-audio'],
            'video': ['ai-type-video', 'usecase-media-production'],
            
            // 사용 사례
            'marketing': ['usecase-marketing', 'industry-marketing'],
            'design': ['usecase-design', 'industry-creative'],
            'development': ['usecase-development', 'industry-tech'],
            'education': ['usecase-education', 'industry-education'],
            'business': ['usecase-business', 'industry-enterprise'],
            
            // 가격
            'free': ['pricing-free'],
            'open source': ['pricing-free', 'features-open-source'],
            'subscription': ['pricing-subscription'],
            'pay': ['pricing-paid'],
            
            // 플랫폼
            'web': ['platform-web', 'features-website'],
            'app': ['platform-app', 'features-app'],
            'api': ['platform-api', 'features-api'],
            'extension': ['platform-browser', 'features-browser-extension']
        };
    }

    /**
     * 도구 설명을 분석하여 태그 제안
     */
    suggestTags(tool) {
        const suggestedTags = new Set(tool.tags || []);
        const text = `${tool.name} ${tool.description}`.toLowerCase();

        // 키워드 매칭
        for (const [keyword, tags] of Object.entries(this.keywordToTags)) {
            if (text.includes(keyword)) {
                tags.forEach(tag => suggestedTags.add(tag));
            }
        }

        // URL 기반 플랫폼 감지
        if (tool.url) {
            if (tool.url.includes('chrome.google.com/webstore')) {
                suggestedTags.add('platform-browser');
                suggestedTags.add('features-browser-extension');
            }
            if (tool.url.includes('github.com')) {
                suggestedTags.add('features-open-source');
                suggestedTags.add('pricing-free');
            }
        }

        return Array.from(suggestedTags);
    }

    /**
     * 모든 도구에 대해 태그 제안
     */
    enrichToolsWithTags(tools) {
        return tools.map(tool => ({
            ...tool,
            tags: this.suggestTags(tool)
        }));
    }
}