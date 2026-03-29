"use client";

import { useEffect, useRef } from "react";
import katex from "katex";

import { ensureString } from "@/lib/utils";

interface KatexRendererProps {
    equation: any; // Allow any to handle potential AI objects
    block?: boolean;
}

export default function KatexRenderer({ equation, block = false }: KatexRendererProps) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const safeEquation = ensureString(equation);

    const cleanFormula = (f: string) => {
        if (!f) return '';
        let cleaned = f.trim();
        if (cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) cleaned = cleaned.slice(2, -2);
        else if (cleaned.startsWith('\\[') && cleaned.endsWith('\\]')) cleaned = cleaned.slice(2, -2);
        else if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) cleaned = cleaned.slice(2, -2);
        else if (cleaned.startsWith('$') && cleaned.endsWith('$')) cleaned = cleaned.slice(1, -1);
        return cleaned.trim();
    };

    useEffect(() => {
        if (containerRef.current) {
            try {
                const finalEq = cleanFormula(safeEquation);
                katex.render(finalEq, containerRef.current, {
                    displayMode: block,
                    throwOnError: false,
                    output: "htmlAndMathml"
                });
            } catch (e) {
                console.error("KaTeX Error:", e);
                containerRef.current.innerText = equation;
            }
        }
    }, [equation, block]);

    return <span ref={containerRef} />;
}
