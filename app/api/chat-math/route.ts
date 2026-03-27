import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import OpenAI from "openai";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "gsk_placeholder",
});

const SYSTEM_PROMPT = `You are a helpful, encouraging math tutor engaging in Socratic dialog.
Your goal is to guide the student to the answer by asking leading questions, NOT by just giving them the answer.
The student is asking a question about a specific step in a math problem they are trying to solve.

LANGUAGE RULE:
You MUST respond in English.
Even if the student asks in another language, you must respond in English.

PEDAGOGICAL RULES:
1. Keep your responses short, conversational, and pedagogical. 
2. MATH in TEXT: DO NOT use dollar signs. Use plain text for math equations or notation like "x = 2".
3. SPACING & READABILITY CRITICAL RULE: You MUST ensure your response has PROPER SPACING between all words. NEVER run words together. 
   - CORRECT: "Step one"
   - INCORRECT: "Stepone"
`;

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
        const { problemText, stepContent, question, chatHistory = [] } = await req.json();

        const currentPrompt = SYSTEM_PROMPT;

        if (!question || !stepContent) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
        }

        const messages: any[] = [
            { role: "system", content: currentPrompt },
            { role: "user", content: `Original Problem: ${problemText}\n\nCurrent Step Context: ${stepContent}\n\nThe student is asking about this specific step. Remember to be Socratic and helpful.` },
            ...chatHistory,
            { role: "user", content: question }
        ];

        let content;

        try {
            const completion = await groq.chat.completions.create({
                messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.6,
            });

            content = completion.choices[0]?.message?.content;
            if (!content) throw new Error("No response from Groq");
        } catch (groqError: any) {
            console.warn("[AI Fallback] Groq failed, attempting OpenAI fallback:", groqError.message);

            if (!process.env.OPENAI_API_KEY) {
                throw new Error("Groq failed and no OpenAI key is available for fallback.");
            }

            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.6,
                    messages
                });

                content = completion.choices[0]?.message?.content;
                if (!content) throw new Error("No response from OpenAI fallback");
            } catch (openaiError: any) {
                console.error("[AI Fallback] OpenAI fallback also failed:", openaiError.message);
                throw new Error(`AI systems are currently unavailable. Groq: ${groqError.message}, OpenAI: ${openaiError.message}`);
            }
        }

        return NextResponse.json({ text: content }, { headers: corsHeaders });

    } catch (error) {
        console.error("Chat AI Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate chat response" },
            { status: 500, headers: corsHeaders }
        );
    }
}
