import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { cleanAIJSON } from "@/lib/utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

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
        const { solution } = await req.json();

        if (!solution) {
            return NextResponse.json({ error: "Missing solution context" }, { status: 400, headers: corsHeaders });
        }

        const prompt = `You are an expert Math Educator. Based on the following math problem solution, generate a "Magic Study Guide".

Problem Context:
Original Problem: ${solution.originalText || solution.transcription}
Subject: ${solution.subject}
Final Answer: ${solution.answerLatex}

Generate a concise, beautiful, and highly educational study guide for this exact topic.
The output MUST be in valid JSON format with this exact structure:
{
  "topic": "Name of the concept/topic (e.g. 'Quadratic Equations')",
  "summary": "A friendly 2-sentence summary of how this concept works.",
  "keyFormulas": [
    { "name": "Formula Name", "formula": "LaTeX formula without dollar signs" }
  ],
  "proTips": [
    "Tip 1 (use dollar signs $...$ for inline math)", 
    "Tip 2"
  ],
  "exampleProblem": {
    "problem": "A similar but different practice problem. Use $...$ for math.",
    "solution": "The step-by-step text explanation. MUST use literal dollar signs ($...$) for inline math so normal text words remain readable."
  }
}

RULES:
1. SPACING & READABILITY: Ensure all text fields have PROPER SPACING between words.
2. LATEX RULES: Inside 'proTips', 'problem', and 'solution', you MUST use dollar signs ($...$) to enclose ALL math equations, numbers, and variables so that the text words render normally with spaces. For 'keyFormulas.formula', provide pure LaTeX without dollar signs.
3. Keep it deeply educational but simple enough for a student to quickly grasp.`;

        let data;

        try {
            if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini Key Configured");
            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
            });
            const result = await model.generateContent(prompt);
            const content = cleanAIJSON((await result.response).text());
            data = JSON.parse(content);
        } catch (geminiError) {
            console.warn("[AI Fallback] Gemini failed, attempting Groq fallback:", geminiError);
            try {
                const completion = await groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.2,
                    messages: [{ role: "user", content: prompt }]
                });
                const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
                if (!content) throw new Error("No content from Groq");
                data = JSON.parse(content);
            } catch (groqError: any) {
                console.warn("[AI Fallback] Groq failed, attempting OpenAI fallback:", groqError.message);
                if (!process.env.OPENAI_API_KEY) throw new Error("No OpenAI key");
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.2,
                    response_format: { type: "json_object" },
                    messages: [{ role: "user", content: prompt }]
                });
                const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
                data = JSON.parse(content);
            }
        }

        return NextResponse.json(data, { headers: corsHeaders });

    } catch (error: any) {
        console.error("Generate Study Guide Error:", error);
        return NextResponse.json(
            { error: "Failed to generate study guide" }, 
            { status: 500, headers: corsHeaders }
        );
    }
}
