import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "gsk_placeholder", // Fallback for build time
});

// Zod schema for the AI response
const MathSolutionSchema = z.object({
    transcription: z.string(),
    confidence: z.number(),
    answerLatex: z.string(),
    steps: z.array(
        z.object({
            title: z.string(),
            explanation: z.string(),
            math: z.string(),
            tip: z.string().nullable().optional(),
        })
    ),
});

export type MathSolution = z.infer<typeof MathSolutionSchema>;

const SYSTEM_PROMPT = `You are a strict but friendly math exam tutor. Explain solutions in clear, formal, exam-style steps. No stories, no metaphors, no baby talk.
ALWAYS return valid JSON exactly matching this schema:
{
  "transcription": "string",
  "confidence": 0.0 to 1.0,
  "answerLatex": "string",
  "steps": [
    {
      "title": "Step Title",
      "explanation": "Clear explanation",
      "math": "LaTeX string",
      "tip": "Short heuristic (optional)"
    }
  ]
}
RULES:
1. Use LaTeX for the "math" and "answerLatex" fields. 
2. NO DOLLAR SIGNS: In "explanation" and "tip", do NOT use dollar signs ($). Use plain text for simple variables (e.g., write "x is not equal to 0" instead of "$x \\neq 0$").
3. CONSISTENCY: Each step should follow a logical flow. Do not skip major algebraic jumps.
4. ACCURACY: Never write incorrect equality chains.
5. DOMAIN RESTRICTIONS: If a simplification removes a denominator, explicitly state the restrictions in plain text within the explanation. No LaTeX like \\frac or curly braces in the explanation.
6. FINAL ANSWER: The "answerLatex" should be the most simplified form.
7. SPACING: Ensure the "transcription" and "explanation" fields have PROPER NATURAL SPACING between words and math symbols. (e.g., "Find the value of y" NOT "Findthevalueofy").
`

const MOCK_RESPONSE: MathSolution = {
    transcription: "Solve for x: 2x + 5 = 15",
    confidence: 0.98,
    answerLatex: "x = 5",
    steps: [
        {
            title: "Isolate the variable term",
            explanation: "Subtract 5 from both sides of the equation to isolate the term with x.",
            math: "2x = 15 - 5 \\\\ 2x = 10",
            tip: "Whatever you do to one side, do to the other.",
        },
        {
            title: "Solve for x",
            explanation: "Divide both sides by 2 to solve for x.",
            math: "x = \\frac{10}{2} \\\\ x = 5",
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

        const { problemText, image } = await req.json();

        if (!problemText && !image) {
            return NextResponse.json({ error: "Missing problem text or image" }, { status: 400, headers: corsHeaders });
        }

        // Mock Mode Check
        if (process.env.MOCK_AI === "true" || !process.env.GROQ_API_KEY) {
            // Simulate delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return NextResponse.json(MOCK_RESPONSE, { headers: corsHeaders });
        }

        const messages: any[] = [
            { role: "system", content: SYSTEM_PROMPT },
        ];

        if (image) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: "Identify and solve the math problem in this image." },
                    {
                        type: "image_url",
                        image_url: {
                            url: image,
                        },
                    },
                ],
            });
        } else {
            messages.push({ role: "user", content: `Solve this math problem: ${problemText}` });
        }

        const completion = await groq.chat.completions.create({
            messages,
            model: image ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile",
            temperature: 0.2, // Low temp for more deterministic output
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No content received from AI");
        }

        const data = JSON.parse(content);
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
