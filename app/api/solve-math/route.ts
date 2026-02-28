import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";

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

const SYSTEM_PROMPT = `You are an expert Math Tutor AI specialized in teaching young children (Grade 2 level). Your job is to solve the problem and break it down into very simple, easy-to-understand steps that a 7 or 8-year-old would understand.

PEDAGOGICAL RULES:
1. TARGET AUDIENCE: Write for a Grade 2 student. Use simple language and short sentences.
2. MATH in TEXT: In the "transcription", "explanation", and "tip" fields, ALWAYS use LaTeX symbols wrapped in single dollar signs for any math (e.g., use $x^2$ instead of "x squared", or $2 \times 3$ instead of "2 times 3").
   - NEVER use computer symbols like ^ or * outside of dollar signs.
3. PROPER MATH RENDERING: All math in the "math" and "answerLatex" fields MUST use valid LaTeX (without dollar signs).
4. TINY STEPS: Break the problem into the smallest possible pieces. Don't skip any mental steps.
5. TONE: Be very encouraging and friendly!
6. ASSUMED KNOWLEDGE: Identify 2-3 simple math concepts that the student should already know to solve this problem (e.g., "$5 + 5 = 10$", "What a group is"). Use LaTeX for math here too.

Provide the response in the following JSON structure ONLY. No markdown, no pre-text, just valid JSON format:
{
  "transcription": "The original problem (e.g., 'What is $5 + 5$?')",
  "subject": "The general math subject (e.g. Basic Addition)",
  "confidence": 0.95,
  "answerLatex": "10",
  "assumedKnowledge": ["$5 + 5$", "Groups of objects"],
  "steps": [
    {
       "title": "Friendly Step Title",
       "explanation": "A simple sentence with math like $2+2$.",
       "math": "2 + 2 = 4",
       "tip": "A tiny $1+1$ hint"
    }
  ]
}

Ensure all math in 'math' and 'answerLatex' is in valid LaTeX format (no dollar signs). In text fields, wrap math in $...$. Do NOT wrap the JSON in markdown code blocks (\`\`\`json).`;

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
            if (!process.env.GEMINI_API_KEY) {
                return NextResponse.json(
                    { error: "Gemini API Key is missing. Please add GEMINI_API_KEY to your .env.local file to use image upload." },
                    { status: 400, headers: corsHeaders }
                );
            }

            // The image is strictly base64 formatted (data:image/jpeg;base64,...), extract only the base64 part
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1];

            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                }
            });

            const result = await model.generateContent([
                SYSTEM_PROMPT,
                "Identify and solve the math problem in this image.",
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    }
                }
            ]);

            const response = await result.response;
            const content = response.text();
            if (!content) throw new Error("No content received from Gemini");
            data = JSON.parse(content);

        } else {
            const messages: any[] = [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Solve this math problem: ${problemText}` }
            ];

            const completion = await groq.chat.completions.create({
                messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.2, // Low temp for more deterministic output
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error("No content received from Groq");
            data = JSON.parse(content);
        }

        // Validate with Zod
        const validatedData = MathSolutionSchema.parse(data);

        return NextResponse.json(validatedData, { headers: corsHeaders });

    } catch (error) {
        console.error("AI Error Full Object:", JSON.stringify(error, null, 2));
        console.error("AI Error Message:", error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate solution" },
            { status: 500, headers: corsHeaders }
        );
    }
}
