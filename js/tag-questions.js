// Tag to Question Mapping for AI Tool Finder
// Maps technical tags to user-friendly questions

import { llmQuestionGenerator } from './llm-question-generator.js';

export const tagQuestions = {
  // Platform/Access Tags
  'features-website': {
    question: '웹사이트에서 사용할 수 있는 도구를 찾으시나요?',
    category: 'platform'
  },
  'features-browser-extension': {
    question: '브라우저 확장 프로그램으로 제공되는 도구를 원하시나요?',
    category: 'platform'
  },
  'features-api': {
    question: 'API를 통해 프로그래밍으로 사용할 수 있는 도구가 필요하신가요?',
    category: 'platform'
  },
  'features-mobile-app': {
    question: '모바일 앱으로 사용할 수 있는 도구를 찾으시나요?',
    category: 'platform'
  },
  'features-desktop-app': {
    question: '데스크톱 애플리케이션으로 사용할 수 있는 도구가 필요하신가요?',
    category: 'platform'
  },
  
  // Pricing Tags
  'pricing-free': {
    question: '무료로 사용할 수 있는 도구를 찾으시나요?',
    category: 'pricing'
  },
  'pricing-freemium': {
    question: '기본 기능은 무료이고 고급 기능은 유료인 프리미엄 모델을 선호하시나요?',
    category: 'pricing'
  },
  'pricing-paid': {
    question: '유료 도구를 사용할 의향이 있으신가요?',
    category: 'pricing'
  },
  
  // Content Type Tags
  'use-cases-text-generation': {
    question: '텍스트 생성이나 글쓰기 도구가 필요하신가요?',
    category: 'content'
  },
  'use-cases-image-generation': {
    question: '이미지 생성이나 편집 도구를 찾으시나요?',
    category: 'content'
  },
  'use-cases-code-generation': {
    question: '코드 생성이나 프로그래밍 도움이 필요하신가요?',
    category: 'content'
  },
  'use-cases-video-generation': {
    question: '비디오 생성이나 편집 도구가 필요하신가요?',
    category: 'content'
  },
  'use-cases-audio-generation': {
    question: '오디오나 음악 관련 도구를 찾으시나요?',
    category: 'content'
  },
  
  // Use Case Tags
  'use-cases-chatbot': {
    question: '챗봇이나 대화형 AI가 필요하신가요?',
    category: 'usecase'
  },
  'use-cases-productivity': {
    question: '생산성 향상을 위한 도구를 찾으시나요?',
    category: 'usecase'
  },
  'use-cases-education': {
    question: '교육이나 학습 목적의 도구가 필요하신가요?',
    category: 'usecase'
  },
  'use-cases-business': {
    question: '비즈니스나 업무용 도구를 찾으시나요?',
    category: 'usecase'
  },
  'use-cases-personal': {
    question: '개인적인 용도로 사용할 도구가 필요하신가요?',
    category: 'usecase'
  },
  'use-cases-design': {
    question: '디자인 관련 작업을 위한 도구가 필요하신가요?',
    category: 'usecase'
  },
  'use-cases-marketing': {
    question: '마케팅이나 광고 관련 도구를 찾으시나요?',
    category: 'usecase'
  },
  'use-cases-data-analysis': {
    question: '데이터 분석이나 인사이트 도구가 필요하신가요?',
    category: 'usecase'
  },
  'use-cases-customer-support': {
    question: '고객 지원이나 서비스 도구를 찾으시나요?',
    category: 'usecase'
  },
  
  // Technical Tags
  'technical-open-source': {
    question: '오픈소스 도구를 선호하시나요?',
    category: 'technical'
  },
  'technical-no-code': {
    question: '코딩 없이 사용할 수 있는 노코드 도구가 필요하신가요?',
    category: 'technical'
  },
  'technical-integration': {
    question: '다른 도구와 연동이 가능한 도구가 필요하신가요?',
    category: 'technical'
  },
  
  // Language Support
  'language-korean': {
    question: '한국어를 지원하는 도구가 필요하신가요?',
    category: 'language'
  },
  'language-english': {
    question: '영어로 사용 가능한 도구를 찾으시나요?',
    category: 'language'
  },
  
  // Special Features
  'features-real-time': {
    question: '실시간 처리나 응답이 중요하신가요?',
    category: 'features'
  },
  'features-collaboration': {
    question: '팀 협업 기능이 필요하신가요?',
    category: 'features'
  },
  'features-offline': {
    question: '오프라인에서도 사용 가능한 도구가 필요하신가요?',
    category: 'features'
  },
  'features-privacy': {
    question: '개인정보 보호나 보안이 중요하신가요?',
    category: 'features'
  }
};

// Get user-friendly question for a tag
export async function getQuestionForTag(tag) {
  // 먼저 하드코딩된 질문 확인
  const tagInfo = tagQuestions[tag];
  if (tagInfo) {
    return tagInfo.question;
  }
  
  // LLM 질문 생성기 사용
  try {
    const question = await llmQuestionGenerator.generateQuestion(tag);
    return question;
  } catch (error) {
    console.error('LLM 질문 생성 실패:', error);
    
    // Fallback: Generate question from tag name
    const tagParts = tag.split('-');
    const category = tagParts[0];
    const feature = tagParts.slice(1).join(' ');
    
    switch(category) {
      case 'features':
        return `${feature} 기능이 있는 AI를 찾으시나요?`;
      case 'use-cases':
        return `${feature} 용도로 사용할 AI가 필요하신가요?`;
      case 'pricing':
        return `${feature} 가격 정책의 AI를 원하시나요?`;
      case 'technical':
        return `${feature} 특성을 가진 AI를 찾으시나요?`;
      default:
        return `${tag}와 관련된 AI를 찾으시나요?`;
    }
  }
}

// Get category for a tag
export function getTagCategory(tag) {
  const tagInfo = tagQuestions[tag];
  return tagInfo ? tagInfo.category : 'other';
}

// Group tags by category
export function groupTagsByCategory(tags) {
  const groups = {};
  
  tags.forEach(tag => {
    const category = getTagCategory(tag);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tag);
  });
  
  return groups;
}