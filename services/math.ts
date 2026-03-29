import { MathSolution } from "@/services/types";
import { awardXP, XP_PER_PROBLEM, XP_PER_PRACTICE } from "./storage";

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

    const res = await withTimeout(
        fetch(`${FINAL_API_URL}/api/solve-math`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ problemText, image, language: "English" }),
        }),
        60000,
        "Request timed out. Please try again."
    );

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to solve problem" }));
        throw new Error(errorData.error || "Failed to solve problem");
    }

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!isJson) {
        throw new Error("Received unexpected response from server. Ensure your backend is running.");
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
}

export async function generatePracticeProblem(currentProblem: string): Promise<MathSolution> {
    const res = await fetch(`${FINAL_API_URL}/api/generate-practice`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentProblem, language: "English" }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to generate practice problem" }));
        throw new Error(errorData.error || "Failed to generate practice problem");
    }

    const solution = await res.json();
    await awardXP(XP_PER_PRACTICE);
    return solution;
}

export async function explainConcept(concept: string): Promise<{ title: string; explanation: string; exampleMath: string }> {
    const res = await fetch(`${FINAL_API_URL}/api/explain-concept`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ concept, language: "English" }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to explain concept" }));
        throw new Error(errorData.error || "Failed to explain concept");
    }

    return await res.json();
}

export async function generateStudyGuide(solution: MathSolution): Promise<any> {
    const res = await fetch(`${FINAL_API_URL}/api/generate-study-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solution }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to generate study guide" }));
        throw new Error(errorData.error || "Failed to generate study guide");
    }

    return await res.json();
}

export async function solveHomework(image: string): Promise<any> {
    const res = await fetch(`${FINAL_API_URL}/api/solve-homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to solve homework" }));
        throw new Error(errorData.error || "Failed to solve homework");
    }

    return await res.json();
}

export async function generateHomeworkGuide(solutions: MathSolution[]): Promise<any> {
    const res = await fetch(`${FINAL_API_URL}/api/generate-homework-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solutions }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to generate homework guide" }));
        throw new Error(errorData.error || "Failed to generate homework guide");
    }

    return await res.json(); // Returns HomeworkGuideData
}
