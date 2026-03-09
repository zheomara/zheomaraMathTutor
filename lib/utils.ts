import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Robustly cleans AI-generated JSON strings, handling unescaped backslashes 
 * common in LaTeX math while preserving valid JSON escapes.
 */
export function cleanAIJSON(str: string): string {
    try {
        // 1. Remove markdown code blocks if present
        let cleaned = str.replace(/```json/g, "").replace(/```/g, "").trim();

        // 2. Fix unescaped backslashes common in LaTeX (e.g., \frac -> \\frac)
        // We protect valid JSON escapes (\", \\, \/, \n, \uXXXX) and escape everything else.
        cleaned = cleaned.replace(/\\\\|\\([\"\\\/n])|\\u([0-9a-fA-F]{4})|\\/g, (match, g1, g2) => {
            if (match === "\\\\") return "\\\\"; // Preserve already escaped backslash
            if (g1 || g2) return match;          // Preserve valid essential escapes or unicode
            return "\\\\";                       // Escape lone backslash
        });

        return cleaned;
    } catch (e) {
        return str;
    }
}
/**
 * Ensures a value is a string, handling cases where AI might return a nested object (e.g., {latex: "..."}).
 */
export function ensureString(val: any): string {
    if (typeof val === "string") return val;
    if (val === null || val === undefined) return "";

    if (typeof val === "object") {
        // Look for common string-containing properties returned by LLMs
        if (val.latex && typeof val.latex === "string") return val.latex;
        if (val.text && typeof val.text === "string") return val.text;
        if (val.answer && typeof val.answer === "string") return val.answer;
        if (val.content && typeof val.content === "string") return val.content;

        // If it's an array, take the first element
        if (Array.isArray(val) && val.length > 0) return ensureString(val[0]);

        // If it's an empty object or has no recognizable fields, just stringify
        try {
            return JSON.stringify(val);
        } catch {
            return String(val);
        }
    }

    return String(val);
}
