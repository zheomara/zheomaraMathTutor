import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { cleanAIJSON } from "@/lib/utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "gsk_placeholder",
});

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
        const { concept } = await req.json();

        if (!concept) {
            return NextResponse.json({ error: "Missing concept" }, { status: 400, headers: corsHeaders });
        }

        let data;

        const prompt = `You are a friendly Math Tutor for a 7-year-old child (Grade 2).

LANGUAGE RULE:
You MUST provide all pedagogical content (title and explanation) in English.
Even if the concept name is in another language, your entire response (except for LaTeX math) must be in English.

Explain the math concept: "${concept}".

Provide a very simple, encouraging, and short explanation.
Include one simple example in LaTeX.

Use the following JSON structure:
{
  "title": "Concept Title",
  "explanation": "Simple explanation. Do not use dollar signs ($) here.",
  "exampleMath": "A simple LaTeX example equation (no dollar signs)"
}

RULES:
1. SPACING & READABILITY CRITICAL RULE: You MUST ensure all text fields (title, explanation) have PROPER SPACING between all words. NEVER run words together. 
   - CORRECT: "Step one"
   - INCORRECT: "Stepone"
2. MATH in TEXT: DO NOT use dollar signs $...$ in the "explanation". Use plain text like "2 + 2 = 4".
3. PROPER MATH RENDERING: All math in the "exampleMath" field MUST use valid LaTeX (without dollar signs).
   - NEVER include labels like "Example:" or "Mhinduro:" inside the math field.
4. Keep it very brief but clear.`;

        try {
            if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini Key Configured");
            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                }
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const content = cleanAIJSON(response.text());
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
                if (!content) throw new Error("No content received from Groq fallback");
                data = JSON.parse(content);
            } catch (groqError: any) {
                console.warn("[AI Fallback] Groq failed, attempting OpenAI fallback:", groqError.message);

                if (!process.env.OPENAI_API_KEY) {
                    throw new Error("Gemini and Groq failed, and no OpenAI key is available for fallback.");
                }

                try {
                    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        temperature: 0.2,
                        response_format: { type: "json_object" },
                        messages: [{ role: "user", content: prompt }]
                    });

                    const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
                    if (!content) throw new Error("No content received from OpenAI fallback");
                    data = JSON.parse(content);
                } catch (openaiError: any) {
                    console.error("[AI Fallback] OpenAI fallback also failed:", openaiError.message);
                    throw new Error(`AI systems are currently unavailable. Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown'}, Groq: ${groqError.message}, OpenAI: ${openaiError.message}`);
                }
            }
        }

        return NextResponse.json(data, { headers: corsHeaders });

    } catch (error: any) {
        console.error("Explain Concept Error:", error);

        const errorMessage = error?.message?.toLowerCase() || "";
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("insufficient") || errorMessage.includes("fallback")) {
            return NextResponse.json(
                { error: "Our AI systems are currently experiencing unusually high demand. Please try again in a few minutes." },
                { status: 503, headers: corsHeaders }
            );
        }

        return NextResponse.json({ error: "Failed to explain concept" }, { status: 500, headers: corsHeaders });
    }
}
