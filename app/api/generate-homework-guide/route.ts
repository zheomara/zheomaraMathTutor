import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { cleanAIJSON } from "@/lib/utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() { return NextResponse.json({}, { headers: corsHeaders }); }

export async function POST(req: NextRequest) {
    try {
        const { solutions } = await req.json();

        if (!solutions || !Array.isArray(solutions)) {
            return NextResponse.json({ error: "Missing or invalid solutions array" }, { status: 400, headers: corsHeaders });
        }

        const problemsContext = solutions.map((s, i) => `Problem ${i + 1}: ${s.originalText || s.transcription}\nSubject: ${s.subject}`).join('\n\n');

        const prompt = `You are an expert Math Educator. A student has just completed a homework sheet containing the following problems:

${problemsContext}

Based on this set of problems, generate an "Ultimate Custom Study Guide".
The output MUST be in valid JSON format with this exact structure:
{
  "topic": "Overall theme covering all problems (e.g. 'Fractions & Ratios')",
  "summary": "A friendly 3-sentence summary of the core concepts they practiced today.",
  "keyFormulas": [
    { "name": "Formula Name", "formula": "LaTeX formula using dollar signs (e.g. $A = \\pi r^2$)" }
  ],
  "proTips": [
    "Tip 1 (use dollar signs $...$ for inline math)", 
    "Tip 2"
  ],
  "practiceProblems": [
    {
      "problem": "Similar practice problem. Use $...$ for math.",
      "solution": "Step-by-step text explanation. MUST use literal dollar signs ($...$) for inline math."
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. PRACTICE PROBLEMS MUST BE EXACTLY 10. Generate exactly 10 practice problems related to the topics on their homework sheet to help them prepare for a test.
2. SPACING & READABILITY: Ensure all text fields have PROPER SPACING between words.
3. MATH FORMATTING: Inside 'formula', 'proTips', 'problem', and 'solution', you MUST use dollar signs ($...$) to enclose ALL math equations, numbers, and variables so that the text words render normally with spaces. 
4. Keep it engaging and educational.`;

        let data;

        try {
            if (!process.env.GROQ_API_KEY) throw new Error("No Groq Key");
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                temperature: 0.2,
                response_format: { type: "json_object" },
                messages: [{ role: "user", content: prompt }]
            });
            data = JSON.parse(cleanAIJSON(completion.choices[0]?.message?.content || ""));
        } catch (groqError) {
            console.warn("[Homework Guide] Groq failed or timed out, attempting Gemini fallback");
            try {
                if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini Key");
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json", temperature: 0.2 } });
                const result = await model.generateContent(prompt);
                data = JSON.parse(cleanAIJSON((await result.response).text()));
            } catch (geminiError: any) {
                console.warn("[Homework Guide] Gemini also failed, attempting final OpenAI fallback");
                if (!process.env.OPENAI_API_KEY) throw new Error("No OpenAI key");
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.2,
                    response_format: { type: "json_object" },
                    messages: [{ role: "user", content: prompt }]
                });
                data = JSON.parse(cleanAIJSON(completion.choices[0]?.message?.content || ""));
            }
        }

        return NextResponse.json(data, { headers: corsHeaders });

    } catch (error: any) {
        console.error("Homework Guide Error:", error);
        return NextResponse.json({ error: "Failed to generate homework guide" }, { status: 500, headers: corsHeaders });
    }
}
