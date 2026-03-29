import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { z } from "zod";
import { cleanAIJSON } from "@/lib/utils";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

const MathSolutionSchema = z.object({
    transcription: z.string(),
    confidence: z.number(),
    answerLatex: z.string(),
    subject: z.string(),
    steps: z.array(z.object({ title: z.string(), explanation: z.string(), math: z.string(), tip: z.string().optional() })),
    assumedKnowledge: z.array(z.string()).optional(),
});

const HomeworkResponseSchema = z.object({
    solutions: z.array(MathSolutionSchema)
});

const SYSTEM_PROMPT = `You are an expert Math Tutor AI specialized in teaching young children (Grade 2 level). 
You will be given a list of math problems from a homework sheet.
Solve EVERY SINGLE ONE of them and break them down into very simple, easy-to-understand steps.

LANGUAGE RULE:
You MUST provide all pedagogical content in English.

PEDAGOGICAL RULES:
1. Write for a Grade 2 student. Use simple language and short sentences.
2. In the "transcription", "explanation", and "tip" fields, use simple text for math (e.g., "2 + 2 = 4"). DO NOT use dollar signs ($) in these fields.
3. All math in the "math" and "answerLatex" fields MUST use valid LaTeX (without dollar signs).
4. Break the problem into the smallest possible pieces.
5. You MUST ensure all text fields have PROPER SPACING between all words. NEVER run words together.

Provide the response in the following JSON structure ONLY. Ensure 'solutions' is an array:
{
  "solutions": [
    {
      "transcription": "The original problem 1",
      "subject": "Addition",
      "confidence": 0.95,
      "answerLatex": "10",
      "assumedKnowledge": ["5 + 5"],
      "steps": [
        {
          "title": "Step Title",
          "explanation": "Simple explanation.",
          "math": "2 + 2 = 4"
        }
      ]
    }
  ]
}`;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() { return NextResponse.json({}, { headers: corsHeaders }); }

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        let { image } = body;

        if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400, headers: corsHeaders });

        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];
        let extractedText = "";

        // OCR Stage - Extract a list of problems
        const ocrPrompt = "Extract ALL math problems from this image. Return them as a numbered list with one problem per line. DO NOT SOLVE THEM.";
        
        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { temperature: 0.1 } });
                const result = await model.generateContent([ocrPrompt, { inlineData: { data: base64Data, mimeType } }]);
                extractedText = (await result.response).text().trim();
            } catch (err) {
                console.warn("[Homework OCR] Gemini failed:", err);
            }
        }

        if (!extractedText && process.env.OPENAI_API_KEY) {
            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.1,
                    messages: [{ role: "user", content: [{ type: "text", text: ocrPrompt }, { type: "image_url", image_url: { url: image } }] }]
                });
                extractedText = completion.choices[0]?.message?.content?.trim() || "";
            } catch (err) {
                 console.error("[Homework OCR] OpenAI also failed");
            }
        }

        if (!extractedText) throw new Error("Failed to extract text from the homework image.");
        console.log("Homework Extracted Text:", extractedText);

        // Solve Stage
        const messages: any[] = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Solve all of these problems:\n\n${extractedText}` }
        ];

        let data;
        try {
            const completion = await groq.chat.completions.create({
                messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
            });
            const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
            data = JSON.parse(content);
        } catch (groqError) {
             console.warn("[Homework Solve] Groq failed, using OpenAI fallback");
             if (!process.env.OPENAI_API_KEY) throw new Error("No AI fallback available");
             const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
             const completion = await openai.chat.completions.create({
                 model: "gpt-4o-mini",
                 temperature: 0.1,
                 response_format: { type: "json_object" },
                 messages
             });
             data = JSON.parse(cleanAIJSON(completion.choices[0]?.message?.content || ""));
        }

        const validatedData = HomeworkResponseSchema.parse(data);
        return NextResponse.json(validatedData, { headers: corsHeaders });

    } catch (error: any) {
        console.error("Homework API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to solve homework" }, { status: 500, headers: corsHeaders });
    }
}
