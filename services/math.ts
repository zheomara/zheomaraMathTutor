import { MathSolution } from "@/services/types";
import { awardXP, XP_PER_PROBLEM, XP_PER_PRACTICE } from "./storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Note: For Android/Capacitor builds, NEXT_PUBLIC_API_URL must be set to a 
// reachable server URL (e.g. https://your-app.vercel.app) because 
// local API routes are not available in the static export.

export async function solveMathProblem(problemText?: string, image?: string): Promise<MathSolution> {
    const res = await fetch(`${API_BASE_URL}/api/solve-math`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ problemText, image }),
    });

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!res.ok) {
        let errorMessage = "Failed to solve problem";
        if (isJson) {
            try {
                const errorData = await res.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) { /* ignore */ }
        } else {
            errorMessage = `Server Error: ${res.status}. Please check your NEXT_PUBLIC_API_URL configuration.`;
        }
        throw new Error(errorMessage);
    }

    if (!isJson) {
        throw new Error("Received unexpected HTML response from server. Ensure your backend is running.");
    }

    try {
        const solution = await res.json();
        await awardXP(XP_PER_PROBLEM);
        return solution;
    } catch (e) {
        throw new Error("Failed to parse solution from server.");
    }
}

export async function generatePracticeProblem(currentProblem: string): Promise<MathSolution> {
    const res = await fetch(`${API_BASE_URL}/api/generate-practice`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentProblem }),
    });

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!res.ok) {
        let errorMessage = "Failed to generate practice problem";
        if (isJson) {
            try {
                const errorData = await res.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) { /* ignore */ }
        } else {
            errorMessage = `Server Error: ${res.status}. Ensure your backend server is accessible.`;
        }
        throw new Error(errorMessage);
    }

    if (!isJson) {
        throw new Error("Unexpected response type from server.");
    }

    try {
        const solution = await res.json();
        await awardXP(XP_PER_PRACTICE);
        return solution;
    } catch (e) {
        throw new Error("Failed to parse practice problem.");
    }
}
export async function explainConcept(concept: string): Promise<{ title: string; explanation: string; exampleMath: string }> {
    const res = await fetch(`${API_BASE_URL}/api/explain-concept`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ concept }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch concept explanation");
    }

    return await res.json();
}
