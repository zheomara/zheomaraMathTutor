import { MathSolution } from "@/services/types";
import { awardXP, XP_PER_PROBLEM, XP_PER_PRACTICE } from "./storage";
import { cleanAIJSON } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Note: For Android/Capacitor builds, NEXT_PUBLIC_API_URL must be set to a 
// reachable server URL (e.g. https://your-app.vercel.app) because 
// local API routes are not available in the static export.

// In-memory cache for solved problems to make repeated requests instant
const solutionCache = new Map<string, MathSolution>();
const MAX_CACHE_SIZE = 10;

// Dynamically adjust API URL to match current port if on localhost
const getApiUrl = (base: string) => {
    if (typeof window !== "undefined" && base.includes("localhost") && !base.includes(window.location.port)) {
        const url = new URL(base);
        url.port = window.location.port;
        return url.toString().replace(/\/$/, "");
    }
    return base.replace(/\/$/, "");
};

const FINAL_API_URL = getApiUrl(API_BASE_URL);

// Helper for timeouts
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
    ]);
};

export async function solveMathProblem(problemText?: string, image?: string): Promise<MathSolution> {
    // Check cache for text-only problems
    if (problemText && !image) {
        const cacheKey = `English:${problemText}`;
        if (solutionCache.has(cacheKey)) {
            console.log("Serving solution from cache...");
            return solutionCache.get(cacheKey)!;
        }
    }

    try {
        const res = await withTimeout(
            fetch(`${FINAL_API_URL}/api/solve-math`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ problemText, image, language: "English" }),
            }),
            15000,
            "Backend solve-math timed out. Falling back to Puter..."
        );

        if (!res.ok) {
            console.warn("Backend solve-math failed, trying Puter fallback...");
            return await solveWithPuter(problemText, image);
        }

        const contentType = res.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (!isJson) {
            throw new Error("Received unexpected HTML response from server. Ensure your backend is running.");
        }

        const solution = await res.json();
        await awardXP(XP_PER_PROBLEM);

        // Cache the solution if it's text-based
        if (problemText && !image) {
            const cacheKey = `English:${problemText}`;
            solutionCache.set(cacheKey, solution);
            if (solutionCache.size > MAX_CACHE_SIZE) {
                const firstKey = solutionCache.keys().next().value;
                if (firstKey !== undefined) solutionCache.delete(firstKey);
            }
        }

        return solution;
    } catch (err: any) {
        console.warn("Backend fetch failed or timed out, trying Puter fallback:", err?.message || err);
        return await solveWithPuter(problemText, image);
    }
}
async function solveWithPuter(text?: string, image?: string): Promise<MathSolution> {
    console.log("Falling back to Puter AI for solving...");
    try {
        const puter = (window as any).puter;
        if (!puter) throw new Error("Puter.js not loaded");

        const prompt = `You are an expert Math Tutor AI specialized in teaching young children (Grade 2 level). Your job is to solve the problem and break it down into very simple, easy-to-understand steps.

        LANGUAGE RULE:
        You MUST provide all pedagogical content in English. 

        PEDAGOGICAL RULES:
        1. TARGET AUDIENCE: Write for a Grade 2 student. Use simple language and short sentences.
        2. MATH in TEXT: In "transcription", "explanation", and "tip" fields, use simple text for math (e.g., "2 + 2 = 4"). DO NOT use dollar signs ($) or any other delimiters.
        3. PROPER MATH RENDERING: All math in "math" and "answerLatex" fields MUST use valid LaTeX (no dollar signs).
           - The "answerLatex" MUST be the final, simplified result (e.g., "10" OR "x = 5"), NOT a restatement of the problem.
           - NEVER include labels like "Final Answer:" or "Mhinduro:" inside math fields.
        4. SPACING & READABILITY: You MUST use proper spacing between ALL words. NEVER run words together (e.g., "Gadzirisa izvi" NOT "Gadzirisaizvi"). This is CRITICAL.
        
        Return ONLY valid JSON:
        {
          "transcription": "...",
          "subject": "...",
          "confidence": 0.9,
          "answerLatex": "...",
          "assumedKnowledge": ["concept1", "concept2"],
          "steps": [{"title": "...", "explanation": "...", "math": "...", "tip": "..."}]
        }`;

        // Prepare content for multimodal message
        const content: any[] = [{ type: "text", text: prompt }];
        if (image) {
            content.push({
                type: "image_url",
                image_url: { url: image }
            });
        } else if (text) {
            content[0].text += `\nProblem text: ${text}`;
        }

        const response = (await withTimeout(
            puter.ai.chat([
                { role: "user", content: content }
            ], { model: 'gpt-4o-mini' }),
            45000,
            "Puter AI took too long to respond. Please try again."
        )) as any;

        const responseText = typeof response === 'string' ? response : response.message.content;
        const jsonStr = cleanAIJSON(responseText);
        const solution = JSON.parse(jsonStr);
        await awardXP(XP_PER_PROBLEM);

        if (text && !image) {
            const cacheKey = `English:${text}`;
            solutionCache.set(cacheKey, solution);
            if (solutionCache.size > MAX_CACHE_SIZE) {
                const firstKey = solutionCache.keys().next().value;
                if (firstKey !== undefined) solutionCache.delete(firstKey);
            }
        }

        return solution;
    } catch (err: any) {
        console.error("Puter solve fallback failed:", err);
        throw new Error(err.message || "Failed to solve problem after fallback.");
    }
}

export async function generatePracticeProblem(currentProblem: string): Promise<MathSolution> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/generate-practice`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ currentProblem, language: "English" }),
        });

        if (!res.ok) {
            console.warn("Backend generate-practice failed, trying Puter...");
            return await generatePracticeWithPuter(currentProblem);
        }

        const solution = await res.json();
        await awardXP(XP_PER_PRACTICE);
        return solution;
    } catch (err) {
        console.warn("Network error during generate-practice, trying Puter...");
        return await generatePracticeWithPuter(currentProblem);
    }
}

async function generatePracticeWithPuter(currentProblem: string): Promise<MathSolution> {
    console.log("Falling back to Puter AI for generating practice...");
    try {
        const puter = (window as any).puter;
        if (!puter) throw new Error("Puter.js not loaded");

        const prompt = `You are a math tutor. Given this current problem: "${currentProblem}", create a SIMILAR but DIFFERENT practice problem for a Grade 2 student.
        
        LANGUAGE RULE: Use English.
        
        PEDAGOGICAL RULES:
        1. SPACING CRITICAL RULE: NEVER run words together. Use spaces between ALL words (e.g. "Step one" NOT "Stepone").
        2. Simple sentences.
        3. NO DOLLAR SIGNS in text.
        4. Provide 4 quiz options.
        
        Return ONLY valid JSON:
        {
          "transcription": "New problem text",
          "subject": "...",
          "confidence": 1.0,
          "answerLatex": "...",
          "quizOptions": [
            {"id": "A", "mathLatex": "...", "isCorrect": false},
            {"id": "B", "mathLatex": "...", "isCorrect": true},
            {"id": "C", "mathLatex": "...", "isCorrect": false},
            {"id": "D", "mathLatex": "...", "isCorrect": false}
          ],
          "steps": [{"title": "...", "explanation": "...", "math": "...", "tip": "..."}]
        }`;

        const response = (await withTimeout(
            puter.ai.chat(prompt, { model: 'gpt-4o-mini' }),
            45000,
            "Puter AI timed out generating practice."
        )) as any;

        const responseText = typeof response === 'string' ? response : response.message.content;
        const jsonStr = cleanAIJSON(responseText);
        const solution = JSON.parse(jsonStr);
        await awardXP(XP_PER_PRACTICE);
        return solution;
    } catch (err: any) {
        console.error("Puter practice fallback failed:", err);
        throw new Error("Failed to generate practice problem.");
    }
}

export async function explainConcept(concept: string): Promise<{ title: string; explanation: string; exampleMath: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/explain-concept`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ concept, language: "English" }),
        });

        if (!res.ok) {
            console.warn("Backend explain-concept failed, trying Puter...");
            return await explainWithPuter(concept);
        }

        return await res.json();
    } catch (err) {
        console.warn("Network error during explain-concept, trying Puter...");
        return await explainWithPuter(concept);
    }
}

async function explainWithPuter(concept: string): Promise<{ title: string; explanation: string; exampleMath: string }> {
    console.log("Falling back to Puter AI for explanation...");
    try {
        const puter = (window as any).puter;
        if (!puter) throw new Error("Puter.js not loaded");

        const prompt = `Explain context: ${concept} to a 7-year-old in English. 
        PEDAGOGICAL RULES:
        1. NO DOLLAR SIGNS: Do not use $ in text.
        2. SPACING CRITICAL: Use proper spacing between all words. NEVER run words together (e.g. "Step one" NOT "Stepone").
        
        Respond ONLY in valid JSON:
        {
          "title": "...",
          "explanation": "...",
          "exampleMath": "LaTeX format"
        }`;

        console.log("Sending explanation request to Puter AI...");
        const response = (await withTimeout(
            puter.ai.chat(prompt, { model: 'gpt-4o-mini' }),
            30000,
            "Puter AI took too long to explain the concept."
        )) as any;

        console.log("Puter AI explained successfully.");
        const content = typeof response === 'string' ? response : response.message.content;
        const jsonStr = cleanAIJSON(content);
        return JSON.parse(jsonStr);
    } catch (err: any) {
        console.error("Puter explain fallback failed:", err);
        throw new Error(err.message || "Failed to explain concept.");
    }
}
