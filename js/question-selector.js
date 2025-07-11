/**
 * 개선된 질문 선택 로직
 * - 중복 방지
 * - 가중치 기반 선택
 * - 히스토리 추적
 */

class QuestionSelector {
    constructor() {
        this.askedQuestions = new Set(); // 이미 물어본 질문 ID
        this.questionHistory = []; // 질문 히스토리
        this.maxHistorySize = 10; // 최근 10개 질문 추적
        this.questionWeights = new Map(); // 질문별 가중치
    }

    /**
     * 질문 초기화
     */
    reset() {
        this.askedQuestions.clear();
        this.questionHistory = [];
        this.questionWeights.clear();
    }

    /**
     * 질문이 이미 사용되었는지 확인
     */
    isQuestionUsed(questionId) {
        return this.askedQuestions.has(questionId);
    }

    /**
     * 질문을 사용됨으로 표시
     */
    markQuestionAsUsed(question) {
        this.askedQuestions.add(question.id);
        this.questionHistory.push(question.id);
        
        // 히스토리 크기 제한
        if (this.questionHistory.length > this.maxHistorySize) {
            const oldQuestionId = this.questionHistory.shift();
            // 오래된 질문은 다시 사용 가능하도록
            this.askedQuestions.delete(oldQuestionId);
        }
    }

    /**
     * 질문 유사도 계산
     */
    calculateSimilarity(question1, question2) {
        if (!question1 || !question2) return 0;
        
        const text1 = question1.toLowerCase();
        const text2 = question2.toLowerCase();
        
        // 간단한 단어 기반 유사도
        const words1 = new Set(text1.split(/\s+/));
        const words2 = new Set(text2.split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * 최근 질문과의 유사도 확인
     */
    isSimilarToRecent(question, recentQuestions, threshold = 0.7) {
        for (const recentQ of recentQuestions) {
            const similarity = this.calculateSimilarity(question.question, recentQ.question);
            if (similarity > threshold) {
                return true;
            }
        }
        return false;
    }

    /**
     * 가중치 기반 질문 선택
     */
    selectWeightedQuestion(questions) {
        // 사용 가능한 질문 필터링
        const availableQuestions = questions.filter(q => 
            !this.isQuestionUsed(q.id)
        );

        if (availableQuestions.length === 0) {
            // 모든 질문을 사용했다면 리셋
            this.askedQuestions.clear();
            return this.selectWeightedQuestion(questions);
        }

        // 최근 질문 가져오기
        const recentQuestions = this.questionHistory
            .slice(-3)
            .map(id => questions.find(q => q.id === id))
            .filter(q => q);

        // 유사하지 않은 질문만 필터링
        const diverseQuestions = availableQuestions.filter(q => 
            !this.isSimilarToRecent(q, recentQuestions)
        );

        const finalCandidates = diverseQuestions.length > 0 ? diverseQuestions : availableQuestions;

        // 가중치 기반 선택
        if (finalCandidates.length === 1) {
            return finalCandidates[0];
        }

        // 도구 수 기반 가중치 계산
        const weights = finalCandidates.map(q => {
            const baseWeight = q.weight || 1.0;
            const toolCountWeight = Math.log(q.tool_count + 1);
            return baseWeight * toolCountWeight;
        });

        // 누적 가중치 계산
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const random = Math.random() * totalWeight;

        let cumulative = 0;
        for (let i = 0; i < finalCandidates.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return finalCandidates[i];
            }
        }

        // 폴백
        return finalCandidates[0];
    }

    /**
     * 다음 질문 선택 (메인 메서드)
     */
    selectNextQuestion(questions, currentFilters = {}) {
        // 현재 필터에 맞는 질문만 선택
        let filteredQuestions = questions;
        
        if (currentFilters.category) {
            filteredQuestions = filteredQuestions.filter(q => 
                q.type === 'category' && q.value === currentFilters.category
            );
        }
        
        if (currentFilters.tags && currentFilters.tags.length > 0) {
            filteredQuestions = filteredQuestions.filter(q => 
                q.type === 'tag' && currentFilters.tags.includes(q.value)
            );
        }

        // 가중치 기반 선택
        const selected = this.selectWeightedQuestion(filteredQuestions);
        
        // 선택된 질문 기록
        if (selected) {
            this.markQuestionAsUsed(selected);
        }

        return selected;
    }

    /**
     * 통계 정보 반환
     */
    getStatistics() {
        return {
            totalAsked: this.askedQuestions.size,
            recentQuestions: this.questionHistory.length,
            historySize: this.maxHistorySize
        };
    }
}

// 전역 인스턴스 생성
window.questionSelector = new QuestionSelector();