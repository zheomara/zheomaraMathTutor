import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { cleanAIJSON } from "@/lib/utils";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "gsk_placeholder",
});

// Reuse the same schema for practice problems
const MathSolutionSchema = z.object({
    transcription: z.string(),
    confidence: z.number(),
    answerLatex: z.string(),
    subject: z.string(),
    quizOptions: z.array(
        z.object({
            id: z.string(),
            mathLatex: z.string(),
            isCorrect: z.boolean(),
        })
    ).length(4).optional(),
    steps: z.array(
        z.object({
            title: z.string(),
            explanation: z.string(),
            math: z.string(),
            tip: z.string().nullable().optional(),
        })
    ),
});

const SYSTEM_PROMPT = `You are a math tutor creating practice problems. 
Given a math problem and its solution, generate a SIMILAR but DIFFERENT practice problem.
The new problem should test the same concept but use different numbers or scenarios.

LANGUAGE RULE:
You MUST provide all pedagogical content (transcription, subject, step titles, step explanations, and tips) in English.
Even if the original problem is in another language, your entire response (except for LaTeX math) must be in English.

ALWAYS return valid JSON exactly matching this schema:
{
  "transcription": "The new problem text (e.g., 'Gadzirisa $2 + 2$')",
  "subject": "e.g., Masvomhu ePasi",
  "confidence": 1.0,
  "answerLatex": "Final answer in LaTeX",
  "quizOptions": [
    { "id": "A", "mathLatex": "Wrong answer 1", "isCorrect": false },
    { "id": "B", "mathLatex": "Correct answer", "isCorrect": true },
    { "id": "C", "mathLatex": "Wrong answer 2", "isCorrect": false },
    { "id": "D", "mathLatex": "Wrong answer 3", "isCorrect": false }
  ],
  "steps": [
    {
      "title": "Step Title",
      "explanation": "Simple explanation",
      "math": "LaTeX string",
      "tip": "Small hint"
    }
  ]
}

RULES:
1. Use LaTeX for the "math" and "answerLatex" fields.
   - The "answerLatex" MUST be the final, simplified result (e.g., "10" OR "x = 5"), NOT a restatement of the problem.
   - NEVER include labels like "Final Answer:" or "Mhinduro:" inside math fields.
2. MATH in TEXT: In "transcription", "explanation", and "tip" fields, use simple text for math (e.g., "2 + 2 = 4"). 
   - DO NOT use dollar signs ($) or any other delimiters in these fields.
3. CONSISTENCY: Follow the same step-by-step logic as a formal exam solution.
4. ACCURACY: Ensure the final answer is mathematically correct.
5. VARIATION: Change the numbers or variables to create a genuinely new exercise.
6. SPACING & READABILITY CRITICAL RULE: You MUST ensure all text fields have PROPER SPACING between all words. NEVER run words together. 
   - CORRECT: "Step one"
   - INCORRECT: "Stepone"
7. QUIZ: You MUST provide exactly 4 distinct 'quizOptions', and exactly ONE of them must have 'isCorrect: true', matching the 'answerLatex'.
`

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        const { currentProblem } = await req.json();

        if (!currentProblem) {
            return NextResponse.json({ error: "Missing current problem data" }, { status: 400, headers: corsHeaders });
        }

        const currentPrompt = SYSTEM_PROMPT;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: currentPrompt },
                { role: "user", content: `Generate a similar practice problem for: ${currentProblem}` },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7, // Slightly higher temp for variation
            response_format: { type: "json_object" },
        });

        const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
        if (!content) throw new Error("No content received from AI");
        const data = JSON.parse(content);
        const validatedData = MathSolutionSchema.parse(data);

        return NextResponse.json(validatedData, { headers: corsHeaders });

    } catch (error) {
        console.error("Practice AI Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate practice problem" },
            { status: 500, headers: corsHeaders }
        );
    }
}
