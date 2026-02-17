"use client";

import { useEffect, useRef } from "react";
import katex from "katex";

interface KatexRendererProps {
    equation: string;
    block?: boolean;
}

export default function KatexRenderer({ equation, block = false }: KatexRendererProps) {
    const containerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            try {
                katex.render(equation, containerRef.current, {
                    displayMode: block,
                    throwOnError: false,
                });
            } catch (e) {
                console.error("KaTeX Error:", e);
                containerRef.current.innerText = equation;
            }
        }
    }, [equation, block]);

    return <span ref={containerRef} />;
}
