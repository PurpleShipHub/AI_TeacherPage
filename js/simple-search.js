/**
 * 간단한 검색 모듈
 * 최소 인덱스를 사용한 빠른 검색
 */

export class SimpleSearch {
    constructor() {
        this.searchIndex = null;
        this.isLoaded = false;
    }
    
    async initialize() {
        try {
            const response = await fetch('data/search_index.json');
            if (!response.ok) {
                throw new Error('검색 인덱스 로드 실패');
            }
            
            this.searchIndex = await response.json();
            this.isLoaded = true;
            
            console.log(`검색 인덱스 로드 완료: ${this.searchIndex.length}개 도구`);
            return true;
            
        } catch (error) {
            console.error('검색 초기화 실패:', error);
            return false;
        }
    }
    
    search(query) {
        if (!this.isLoaded || !this.searchIndex) {
            return [];
        }
        
        const queryLower = query.toLowerCase().trim();
        if (!queryLower) {
            return [];
        }
        
        const results = [];
        
        // 검색 실행
        for (const item of this.searchIndex) {
            const nameLower = item.n.toLowerCase();
            
            // 이름에 쿼리가 포함되어 있는지 확인
            if (nameLower.includes(queryLower)) {
                const score = this.calculateScore(nameLower, queryLower);
                
                results.push({
                    id: item.i,
                    name: item.n,
                    category: item.c,
                    score: score
                });
            }
        }
        
        // 점수순 정렬
        results.sort((a, b) => b.score - a.score);
        
        // 상위 20개만 반환
        return results.slice(0, 20);
    }
    
    calculateScore(name, query) {
        // 정확히 일치
        if (name === query) {
            return 100;
        }
        
        // 이름이 쿼리로 시작
        if (name.startsWith(query)) {
            return 80;
        }
        
        // 단어 경계에서 시작
        const words = name.split(/[\s\-_]+/);
        for (const word of words) {
            if (word.startsWith(query)) {
                return 70;
            }
        }
        
        // 쿼리가 이름의 앞부분에 있음
        const index = name.indexOf(query);
        if (index < 5) {
            return 60;
        }
        
        // 그냥 포함
        return 40;
    }
    
    // 카테고리별 필터링
    filterByCategory(category) {
        if (!this.isLoaded || !this.searchIndex) {
            return [];
        }
        
        return this.searchIndex
            .filter(item => item.c === category)
            .slice(0, 100)  // 최대 100개
            .map(item => ({
                id: item.i,
                name: item.n,
                category: item.c
            }));
    }
    
    // 자동완성용 - 빠른 검색
    suggest(query, limit = 5) {
        if (!this.isLoaded || !this.searchIndex || !query) {
            return [];
        }
        
        const queryLower = query.toLowerCase();
        const suggestions = [];
        
        // 이름이 쿼리로 시작하는 것 우선
        for (const item of this.searchIndex) {
            if (item.n.toLowerCase().startsWith(queryLower)) {
                suggestions.push({
                    id: item.i,
                    name: item.n,
                    category: item.c
                });
                
                if (suggestions.length >= limit) {
                    break;
                }
            }
        }
        
        return suggestions;
    }
    
    // 카테고리 목록 가져오기
    getCategories() {
        if (!this.isLoaded || !this.searchIndex) {
            return [];
        }
        
        const categoryCount = {};
        
        for (const item of this.searchIndex) {
            if (item.c) {
                categoryCount[item.c] = (categoryCount[item.c] || 0) + 1;
            }
        }
        
        // 카테고리를 도구 수 기준으로 정렬
        return Object.entries(categoryCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }
}

// 전역 검색 인스턴스 (선택적)
window.aiTeacherSearch = new SimpleSearch();