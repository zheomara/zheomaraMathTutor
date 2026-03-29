"use client";

import React, { useEffect, useState, useMemo } from 'react';
import parse, { attributesToProps, Element } from 'html-react-parser';
import { motion } from 'framer-motion';

interface SvgAnimatedMathProps {
    equation: string;
    block?: boolean;
    className?: string;
    animationDuration?: number; // Total target duration for drawing
    isAnimating?: boolean; // Controls whether to show animation or instantly render
    onComplete?: () => void;
}

export default function SvgAnimatedMath({ 
    equation, 
    block = false, 
    className = "", 
    animationDuration = 2.5,
    isAnimating = true,
    onComplete
}: SvgAnimatedMathProps) {
    const [svgString, setSvgString] = useState<string | null>(null);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        const fetchSvg = async () => {
            try {
                const res = await fetch('/api/mathjax', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latex: equation, display: block })
                });

                if (!res.ok) throw new Error('Failed to fetch SVG');

                const data = await res.json();
                if (data.svg) {
                    setSvgString(data.svg);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("SvgAnimatedMath error:", err);
                setError(true);
            }
        };

        if (equation) {
            fetchSvg();
        }
    }, [equation, block]);

    const parsedSvg = useMemo(() => {
        if (!svgString) return null;

        // Count paths to calculate sequential timing
        const pathMatches = svgString.match(/<path/g);
        const pathCount = pathMatches ? pathMatches.length : 1;
        // ensure no division by zero
        const safePathCount = Math.max(1, pathCount); 
        
        // Stagger strokes. Provide a little overlap for fluidity.
        const staggerDelay = animationDuration / safePathCount; 
        const strokeDuration = Math.min(0.5, staggerDelay * 4); 

        let pathIndex = 0;
        let highestDelay = 0;

        const reactElement = parse(svgString || "", {
            replace: (domNode) => {
                if (domNode instanceof Element && domNode.name === 'path') {
                    const props = attributesToProps(domNode.attribs);
                    const currentIdx = pathIndex++;
                    const delay = currentIdx * staggerDelay;
                    
                    if (!isAnimating) {
                        return <path {...props} />;
                    }

                    return (
                        <motion.path
                            {...props}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: Math.max(0.7, 1 - currentIdx*0.01) }} // keep fully visible
                            style={{ 
                                fill: typeof props.fill === 'string' ? props.fill : "currentColor", 
                                stroke: "currentColor", 
                                strokeWidth: "15px" 
                            }} 
                            transition={{
                                duration: strokeDuration,
                                delay: delay,
                                ease: "easeInOut"
                            }}
                        />
                    );
                }
            }
        });

        // Trigger onComplete reliably using a timer identical to the total animation duration
        if (onComplete) {
            const totalDuration = safePathCount * staggerDelay + strokeDuration;
            setTimeout(onComplete, isAnimating ? totalDuration * 1000 : 100);
        }

        return reactElement;

    }, [svgString, isAnimating, animationDuration, onComplete]);

    if (error) {
        // Fallback or error state
        return <span className={`text-red-500 ${className}`}>{equation}</span>;
    }

    if (!svgString) {
        // Loading state
        return <span className={`opacity-0 ${className}`}>{equation}</span>;
    }

    return (
        <span className={`inline-block w-auto h-auto transition-colors ${className}`}>
            {parsedSvg}
        </span>
    );
}
