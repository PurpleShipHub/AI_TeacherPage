/**
 * Tools Index 어댑터
 * 짧은 키 이름을 사용하는 새로운 형식과 기존 코드의 호환성 제공
 */

export class ToolsIndexAdapter {
    constructor(toolsData) {
        this.rawData = toolsData;
        this.tools = this.convertToFullFormat(toolsData);
    }
    
    convertToFullFormat(data) {
        // 새로운 형식 (짧은 키) -> 기존 형식 변환
        if (data && data.length > 0 && 'i' in data[0]) {
            return data.map(item => ({
                id: item.i,
                name: item.n,
                category: item.c || 'other',
                rating: item.r || 0,
                monthly_visits: item.v || 0
            }));
        }
        
        // 이미 기존 형식이면 그대로 반환
        return data;
    }
    
    // 기존 코드와의 호환성을 위한 메서드들
    getTools() {
        return this.tools;
    }
    
    findById(id) {
        return this.tools.find(tool => tool.id === id);
    }
    
    filterByCategory(category) {
        return this.tools.filter(tool => tool.category === category);
    }
    
    // 직접 배열처럼 사용할 수 있도록
    get length() {
        return this.tools.length;
    }
    
    // 배열 메서드 프록시
    map(fn) {
        return this.tools.map(fn);
    }
    
    filter(fn) {
        return this.tools.filter(fn);
    }
    
    find(fn) {
        return this.tools.find(fn);
    }
    
    forEach(fn) {
        return this.tools.forEach(fn);
    }
}

// tools_index.json 로드 헬퍼
export async function loadToolsIndex() {
    try {
        const response = await fetch('data/tools_index.json');
        if (!response.ok) {
            throw new Error('Tools index load failed');
        }
        
        const data = await response.json();
        return new ToolsIndexAdapter(data);
        
    } catch (error) {
        console.error('Failed to load tools index:', error);
        return new ToolsIndexAdapter([]);
    }
}