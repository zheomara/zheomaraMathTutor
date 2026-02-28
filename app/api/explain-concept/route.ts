import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

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

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
            }
        });

        const prompt = `You are a friendly Math Tutor for a 7-year-old child (Grade 2).
Explain the math concept: "${concept}".

Provide a very simple, encouraging, and short explanation.
Include one simple example in LaTeX.

Use the following JSON structure:
{
  "title": "Friendly title for the concept",
  "explanation": "Simple 1-2 sentence explanation. No computer symbols like ^ or *. Use $...$ for math here.",
  "exampleMath": "A simple LaTeX example equation (no dollar signs)"
}

Keep it very brief but clear.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json(JSON.parse(text), { headers: corsHeaders });

    } catch (error: any) {
        console.error("Explain Concept Error:", error);
        return NextResponse.json({ error: "Failed to explain concept" }, { status: 500, headers: corsHeaders });
    }
}
