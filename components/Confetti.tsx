"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
    active: boolean;
    onComplete?: () => void;
}

export default function Confetti({ active, onComplete }: ConfettiProps) {
    const [particles, setParticles] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);

    useEffect(() => {
        if (active) {
            const newParticles = Array.from({ length: 80 }).map((_, i) => ({
                id: Math.random(),
                x: Math.random() * 100,
                color: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#F472B6", "#34D399"][Math.floor(Math.random() * 8)],
                delay: Math.random() * 0.8,
            }));
            setParticles(newParticles);

            const timer = setTimeout(() => {
                setParticles([]);
                if (onComplete) onComplete();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [active, onComplete]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
                        animate={{
                            y: "110vh",
                            x: `${p.x + (Math.random() * 10 - 5)}vw`,
                            opacity: 0,
                            rotate: 360,
                        }}
                        transition={{
                            duration: 2 + Math.random(),
                            delay: p.delay,
                            ease: "easeOut",
                        }}
                        style={{
                            position: "absolute",
                            width: "10px",
                            height: "10px",
                            backgroundColor: p.color,
                            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
