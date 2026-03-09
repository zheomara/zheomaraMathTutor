import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import OpenAI from "openai";
import { z } from "zod";
import { cleanAIJSON } from "@/lib/utils";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "gsk_placeholder", // Fallback for build time
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

// Zod schema for the AI response
const MathSolutionSchema = z.object({
    transcription: z.string(),
    confidence: z.number(),
    answerLatex: z.string(),
    subject: z.string(),
    steps: z.array(
        z.object({
            title: z.string(),
            explanation: z.string(),
            math: z.string(),
            tip: z.string().optional(),
        })
    ),
    quizOptions: z.array(
        z.object({
            id: z.string(),
            mathLatex: z.string(),
            isCorrect: z.boolean(),
        })
    ).optional(),
    assumedKnowledge: z.array(z.string()).optional(),
});

export type MathSolution = z.infer<typeof MathSolutionSchema>;

const SYSTEM_PROMPT = `You are an expert Math Tutor AI specialized in teaching young children (Grade 2 level). Your job is to solve the problem and break it down into very simple, easy-to-understand steps.

LANGUAGE RULE:
You MUST provide all pedagogical content (transcription, subject, assumedKnowledge, step titles, step explanations, and tips) in English.
Even if the original problem is in another language, your entire response (except for LaTeX math) must be in English.

PEDAGOGICAL RULES:
1. TARGET AUDIENCE: Write for a Grade 2 student. Use simple language and short sentences.
2. MATH in TEXT: In the "transcription", "explanation", and "tip" fields, use simple text for math (e.g., "2 + 2 = 4" or "2 x 3 = 6"). 
   - DO NOT use dollar signs ($) or any other delimiters in these fields. 
   - NEVER use computer symbols like ^ or *; use plain text equivalents.
3. PROPER MATH RENDERING: All math in the "math" and "answerLatex" fields MUST use valid LaTeX (without dollar signs).
   - The "answerLatex" MUST be the final, simplified result (e.g., "10" OR "x = 5"), NOT a restatement of the problem.
   - NEVER include labels like "Final Answer:" or "Mhinduro:" inside math fields.
4. TINY STEPS: Break the problem into the smallest possible pieces. Don't skip any mental steps.
5. TONE: Be very encouraging and friendly!
6. SPACING & READABILITY CRITICAL RULE: You MUST ensure all text fields (transcription, subject, title, explanation, tip) have PROPER SPACING between all words. NEVER run words together. 
   - CORRECT: "Step one"
   - INCORRECT: "Stepone"
7. ASSUMED KNOWLEDGE: Identify 2-3 simple math concepts that the student should already know to solve this problem (e.g., "5 + 5 = 10", "What a group is"). 

Provide the response in the following JSON structure ONLY. No markdown, no pre-text, just valid JSON format:
{
  "transcription": "The original problem (e.g., 'Solve 5 + 5')",
  "subject": "The general math subject (e.g. Addition)",
  "confidence": 0.95,
  "answerLatex": "10",
  "assumedKnowledge": ["5 + 5", "Groups"],
  "steps": [
    {
      "title": "Step Title",
      "explanation": "Simple explanation with math like 2 + 2.",
      "math": "2 + 2 = 4",
      "tip": "Targeted hint with 1 + 1"
    }
  ]
}

Ensure all math in 'math' and 'answerLatex' is in valid LaTeX format (no dollar signs). Do NOT wrap the JSON in markdown code blocks (\`\`\`json).`;

const MOCK_RESPONSE: MathSolution = {
    transcription: "Solve $2 \times 3 + 4$",
    confidence: 1.0,
    answerLatex: "10",
    subject: "Basic Math",
    assumedKnowledge: [
        "How to count up to $10$",
        "What 'groups of' means",
        "Plus means adding items together"
    ],
    steps: [
        {
            title: "Let's do the multiplication first!",
            explanation: "We start with $2$ groups of $3$. If we have $2$ groups and put $3$ apples in each group, how many do we have?",
            math: "2 \\times 3 = 6",
            tip: "We always do multiplication before addition!",
        },
        {
            title: "Now add the last number",
            explanation: "Now we take our $6$ and add $4$ more to it. Let's count up from $6$: $7, 8, 9, 10$!",
            math: "6 + 4 = 10",
        },
    ],
};

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
        console.log("API Route Hit");
        console.log("GROQ_KEY_EXISTS:", !!process.env.GROQ_API_KEY);
        console.log("GROQ_KEY_PREFIX:", process.env.GROQ_API_KEY?.substring(0, 4));

        const body = await req.json();
        const { problemText, image } = body;

        const currentPrompt = SYSTEM_PROMPT;

        if (!problemText && !image) {
            return NextResponse.json({ error: "Missing problem text or image" }, { status: 400, headers: corsHeaders });
        }

        // Mock Mode Check
        if (process.env.MOCK_AI === "true" || !process.env.GROQ_API_KEY) {
            // Simulate delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return NextResponse.json(MOCK_RESPONSE, { headers: corsHeaders });
        }

        let data;

        if (image) {
            if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
                return NextResponse.json(
                    { error: "AI API Keys missing. Add GEMINI_API_KEY or OPENAI_API_KEY to your .env.local file to use image upload." },
                    { status: 400, headers: corsHeaders }
                );
            }

            // The image is strictly base64 formatted (data:image/jpeg;base64,...), extract only the base64 part
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1];

            try {
                if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini Key Configured");

                const model = genAI.getGenerativeModel({
                    model: "gemini-flash-latest",
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2,
                    }
                });

                const result = await model.generateContent([
                    currentPrompt,
                    "Identify and solve the math problem in this image.",
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        }
                    }
                ]);

                const response = await result.response;
                const content = cleanAIJSON(response.text());
                if (!content) throw new Error("No content received from Gemini");
                data = JSON.parse(content);
            } catch (geminiError: any) {
                console.warn("[AI Fallback] Gemini failed, attempting OpenAI fallback:", geminiError.message);

                if (!process.env.OPENAI_API_KEY) {
                    throw new Error("Gemini failed, and no OpenAI key is available for fallback.");
                }

                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.2,
                    response_format: { type: "json_object" },
                    messages: [
                        { role: "system", content: currentPrompt },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Identify and solve the math problem in this image." },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:${mimeType};base64,${base64Data}`
                                    }
                                }
                            ]
                        }
                    ]
                });

                const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
                if (!content) throw new Error("No content received from OpenAI fallback");
                data = JSON.parse(content);
            }

        } else {
            const messages: any[] = [
                { role: "system", content: currentPrompt },
                { role: "user", content: `Solve this math problem: ${problemText}` }
            ];

            try {
                const completion = await groq.chat.completions.create({
                    messages,
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.2, // Low temp for more deterministic output
                    response_format: { type: "json_object" },
                });

                const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
                if (!content) throw new Error("No content received from Groq");
                data = JSON.parse(content);
            } catch (groqError: any) {
                console.warn("[AI Fallback] Groq failed, attempting OpenAI fallback for text:", groqError.message);

                if (!process.env.OPENAI_API_KEY) {
                    throw new Error("Groq failed and no OpenAI key is available for fallback.");
                }

                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.2,
                    response_format: { type: "json_object" },
                    messages
                });

                const content = cleanAIJSON(completion.choices[0]?.message?.content || "");
                if (!content) throw new Error("No content received from OpenAI fallback");
                data = JSON.parse(content);
            }
        }

        // Validate with Zod
        const validatedData = MathSolutionSchema.parse(data);

        return NextResponse.json(validatedData, { headers: corsHeaders });

    } catch (error: any) {
        console.error("AI Error Full Object:", JSON.stringify(error, null, 2));
        console.error("AI Error Message:", error instanceof Error ? error.message : String(error));

        const errorMessage = error?.message?.toLowerCase() || "";
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("insufficient") || errorMessage.includes("fallback")) {
            return NextResponse.json(
                { error: "Our AI systems are currently experiencing unusually high demand (Quota limits). Please try again in a few minutes." },
                { status: 503, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate solution" },
            { status: 500, headers: corsHeaders }
        );
    }
}
