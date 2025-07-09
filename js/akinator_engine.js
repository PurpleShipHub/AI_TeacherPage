/**
 * 아키네이터 스타일 엔트로피 기반 질문 선택 엔진
 * 정보 이론을 사용하여 가장 효율적인 질문을 동적으로 선택
 */

class AkinatorEngine {
    constructor(tools, questions) {
        this.allTools = tools;
        this.allQuestions = questions;
        this.remainingTools = [...tools];
        this.askedQuestions = new Set();
        this.userAnswers = new Map();
        this.confidence = 0;
        this.maxQuestions = 20; // 아키네이터 스타일 제한
    }

    /**
     * 엔트로피 계산 (정보 이론)
     * H(X) = -Σ p(x) * log2(p(x))
     */
    calculateEntropy(tools) {
        if (tools.length <= 1) return 0;
        
        // 카테고리별 분포 계산
        const categories = {};
        tools.forEach(tool => {
            const category = tool.category;
            categories[category] = (categories[category] || 0) + 1;
        });

        // 엔트로피 계산
        let entropy = 0;
        const total = tools.length;
        Object.values(categories).forEach(count => {
            const probability = count / total;
            if (probability > 0) {
                entropy -= probability * Math.log2(probability);
            }
        });

        return entropy;
    }

    /**
     * 정보 획득량 계산
     * IG(Q) = H(전체) - Σ (|subset| / |total|) * H(subset)
     */
    calculateInformationGain(question, tools) {
        const currentEntropy = this.calculateEntropy(tools);
        
        // 질문 답변별로 도구들을 분할
        const splits = this.splitToolsByQuestion(question, tools);
        
        // 가중 평균 엔트로피 계산
        let weightedEntropy = 0;
        const totalTools = tools.length;
        
        Object.values(splits).forEach(subset => {
            if (subset.length > 0) {
                const weight = subset.length / totalTools;
                const subsetEntropy = this.calculateEntropy(subset);
                weightedEntropy += weight * subsetEntropy;
            }
        });

        return currentEntropy - weightedEntropy;
    }

    /**
     * 질문에 따라 도구들을 분할
     */
    splitToolsByQuestion(question, tools) {
        const splits = { yes: [], no: [], unknown: [] };

        tools.forEach(tool => {
            const probability = this.calculateAnswerProbability(question, tool);
            
            if (probability.yes > 0.7) {
                splits.yes.push(tool);
            } else if (probability.no > 0.7) {
                splits.no.push(tool);
            } else {
                splits.unknown.push(tool);
            }
        });

        return splits;
    }

    /**
     * 특정 도구에 대한 질문 답변 확률 계산
     */
    calculateAnswerProbability(question, tool) {
        let yesScore = 0.5; // 기본값

        // 태그 기반 확률 계산
        if (question.targetTags) {
            const matchingTags = tool.tags.filter(tag => 
                question.targetTags.includes(tag)
            ).length;
            const relevance = matchingTags / question.targetTags.length;
            yesScore = Math.min(0.9, 0.1 + relevance * 0.8);
        }

        // 가중치 기반 확률 조정
        if (question.weightTarget && tool.weights && tool.weights[question.weightTarget]) {
            const weightValue = tool.weights[question.weightTarget];
            yesScore = (yesScore + weightValue) / 2;
        }

        // 카테고리 기반 확률 조정
        if (question.category && tool.category === question.category) {
            yesScore = Math.min(0.95, yesScore + 0.3);
        }

        return {
            yes: yesScore,
            no: 1 - yesScore,
            unknown: 0.1 // 항상 작은 불확실성 유지
        };
    }

    /**
     * 다음 최적 질문 선택 (엔트로피 기반)
     */
    selectBestQuestion() {
        if (this.remainingTools.length <= 1) {
            return null; // 추천 완료
        }

        let bestQuestion = null;
        let maxInformationGain = -1;

        // 아직 묻지 않은 질문들 중에서 최적 선택
        const availableQuestions = this.allQuestions.filter(q => 
            !this.askedQuestions.has(q.id) && this.isQuestionRelevant(q)
        );

        availableQuestions.forEach(question => {
            const informationGain = this.calculateInformationGain(question, this.remainingTools);
            
            // 질문 중요도 가중치 적용
            const weightedGain = informationGain * (question.importance || 1.0);

            if (weightedGain > maxInformationGain) {
                maxInformationGain = weightedGain;
                bestQuestion = question;
            }
        });

        return bestQuestion;
    }

    /**
     * 질문 관련성 확인
     */
    isQuestionRelevant(question) {
        // 조건부 질문 체크
        if (question.condition) {
            const lastAnswer = Array.from(this.userAnswers.values()).pop();
            if (lastAnswer && question.condition.previousAnswer !== lastAnswer.answer) {
                return false;
            }
        }

        // 남은 도구들과 관련성 체크
        if (question.targetTags) {
            return this.remainingTools.some(tool => 
                tool.tags.some(tag => question.targetTags.includes(tag))
            );
        }

        return true;
    }

    /**
     * 사용자 답변 처리 및 도구 필터링
     */
    processAnswer(questionId, answer) {
        const question = this.allQuestions.find(q => q.id === questionId);
        if (!question) return;

        // 답변 기록
        this.userAnswers.set(questionId, { question, answer });
        this.askedQuestions.add(questionId);

        // 확률 기반 필터링
        this.remainingTools = this.remainingTools.filter(tool => {
            const probability = this.calculateAnswerProbability(question, tool);
            
            if (answer === 'yes') {
                return probability.yes > 0.3; // 30% 이상 확률
            } else if (answer === 'no') {
                return probability.no > 0.3;
            } else { // unknown
                return true; // 불확실한 답변은 제외하지 않음
            }
        });

        // 신뢰도 계산
        this.updateConfidence();
    }

    /**
     * 추천 신뢰도 업데이트
     */
    updateConfidence() {
        if (this.remainingTools.length === 1) {
            this.confidence = 0.95;
        } else if (this.remainingTools.length <= 3) {
            this.confidence = 0.8;
        } else if (this.remainingTools.length <= 5) {
            this.confidence = 0.6;
        } else {
            this.confidence = Math.max(0.1, 1 - (this.remainingTools.length / this.allTools.length));
        }
    }

    /**
     * 최종 추천 생성
     */
    generateRecommendation() {
        if (this.remainingTools.length === 0) {
            return null;
        }

        // 남은 도구들 중 가장 적합한 것 선택
        const scoredTools = this.remainingTools.map(tool => ({
            ...tool,
            score: this.calculateFinalScore(tool),
            confidence: this.confidence
        }));

        return scoredTools.sort((a, b) => b.score - a.score)[0];
    }

    /**
     * 최종 점수 계산 (모든 답변 종합)
     */
    calculateFinalScore(tool) {
        let score = 0.5;
        let totalWeight = 0;

        this.userAnswers.forEach(({ question, answer }) => {
            const probability = this.calculateAnswerProbability(question, tool);
            const weight = question.importance || 1.0;
            
            if (answer === 'yes') {
                score += probability.yes * weight;
            } else if (answer === 'no') {
                score += probability.no * weight;
            } else {
                score += 0.5 * weight; // 중립
            }
            
            totalWeight += weight;
        });

        return totalWeight > 0 ? score / totalWeight : 0.5;
    }

    /**
     * 게임 상태 정보
     */
    getGameState() {
        return {
            remainingTools: this.remainingTools.length,
            totalTools: this.allTools.length,
            questionsAsked: this.askedQuestions.size,
            maxQuestions: this.maxQuestions,
            confidence: this.confidence,
            progress: this.askedQuestions.size / this.maxQuestions
        };
    }

    /**
     * 게임 종료 조건 체크
     */
    shouldEndGame() {
        return (
            this.remainingTools.length <= 1 ||
            this.confidence >= 0.9 ||
            this.askedQuestions.size >= this.maxQuestions
        );
    }
}

// 전역 사용을 위한 내보내기
window.AkinatorEngine = AkinatorEngine;