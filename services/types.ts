export interface Step {
    title: string;
    explanation: string;
    math: string;
    tip?: string;
}

export interface MathSolution {
    transcription: string;
    confidence: number;
    answerLatex: string;
    steps: Step[];
    originalImage?: string; // Base64
    originalText?: string;
    subject?: string;
    quizOptions?: { id: string; mathLatex: string; isCorrect: boolean }[];
    assumedKnowledge?: string[];
}

export interface HomeworkData {
    originalImage?: string;
    solutions: MathSolution[];
}

export interface HomeworkGuideData {
    topic: string;
    summary: string;
    keyFormulas: { name: string; formula: string }[];
    proTips: string[];
    practiceProblems: { problem: string; solution: string }[];
}
