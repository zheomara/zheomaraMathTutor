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
