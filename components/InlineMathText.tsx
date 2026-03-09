import { ensureString } from "@/lib/utils";
import KatexRenderer from "./KatexRenderer";

interface InlineMathTextProps {
    text: any; // Allow any to handle potential AI objects
    className?: string;
}

export default function InlineMathText({ text, className }: InlineMathTextProps) {
    const safeText = ensureString(text);
    if (!safeText) return null;

    // Split text by $ delimiters or \( \) delimiters
    // e.g., "The answer is $x^2$" -> ["The answer is ", "x^2"]
    // e.g., "The answer is \(x^2\)" -> ["The answer is ", "x^2"]

    // We use a regex that captures the content inside either $...$ or \(...\)
    const regex = /(?:\$([^$]+)\$)|(?:\\\((.*?)\\\))/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(safeText)) !== null) {
        // Add the text before the match
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: safeText.slice(lastIndex, match.index) });
        }

        // The math content is in either capture group 1 (for $) or capture group 2 (for \()
        const mathContent = match[1] || match[2];
        parts.push({ type: 'math', content: mathContent });

        lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < safeText.length) {
        parts.push({ type: 'text', content: safeText.slice(lastIndex) });
    }

    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (part.type === 'math') {
                    return <KatexRenderer key={index} equation={part.content} />;
                }
                return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part.content}</span>;
            })}
        </span>
    );
}
