import KatexRenderer from "./KatexRenderer";

interface InlineMathTextProps {
    text: string;
    className?: string;
}

export default function InlineMathText({ text, className }: InlineMathTextProps) {
    if (!text) return null;

    // Split text by $ delimiters
    // e.g., "The answer is $x^2$" -> ["The answer is ", "x^2"]
    const parts = text.split(/\$(.*?)\$/g);

    return (
        <span className={className}>
            {parts.map((part, index) => {
                // Odd indices are the content between $ delimiters
                if (index % 2 === 1) {
                    return <KatexRenderer key={index} equation={part} />;
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}
