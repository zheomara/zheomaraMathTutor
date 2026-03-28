"use client";

import { MathSolution, Step } from "@/services/types";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, SkipForward, SkipBack, Bot, Sparkles, Star, Heart, Trophy } from "lucide-react";
import KatexRenderer from "./KatexRenderer";
import { Button } from "./ui/Button";

interface VisualizerProps {
    solution: MathSolution;
    onClose: () => void;
}

const MASCOT_MESSAGES = [
    "Ready to learn?",
    "Let me think...",
    "Observe this!",
    "Almost there...",
    "Eureka!",
    "Great job!",
];

export default function Visualizer({ solution, onClose }: VisualizerProps) {
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(true);
    const [celebrate, setCelebrate] = useState(false);
    const steps = solution.steps;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && currentStep < steps.length - 1) {
            // Dynamically calculate delay so the voice TTS never gets cut off on long paragraphs
            let dynamicDelay = 6000; // minimum reading plus animation time
            if (currentStep >= 0) {
                const textLength = (steps[currentStep].title + steps[currentStep].explanation).length;
                const estimatedReadTimeMs = (textLength / 12) * 1000; // ~12 characters per second reading speed
                dynamicDelay = Math.max(6000, estimatedReadTimeMs + 1000); // Add 1s breather
            }

            timer = setTimeout(() => {
                setCurrentStep((prev) => prev + 1);
            }, dynamicDelay);
        } else if (currentStep === steps.length - 1 && isPlaying) {
            setIsPlaying(false);
            setCelebrate(true);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, currentStep, steps.length]);

    // Load available voices once (required by Chrome/Safari to initialize voices)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    // Text-to-Speech Narration synchronized with the animation
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // Immediately cancel any currently playing audio so voices don't overlap
        window.speechSynthesis.cancel();

        // Only speak if we are on a valid step and the player is active
        if (currentStep >= 0 && currentStep < steps.length && isPlaying) {
            const step = steps[currentStep];
            
            // Clean up LaTeX markers so the voice engine reads normal words and numbers
            const cleanExplanation = step.explanation.replace(/[\$\\\(\)]/g, "");
            const textToSpeak = `${step.title}. ${cleanExplanation}`;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            
            // Set properties for a more "tutor-like" clear voice
            utterance.rate = 0.95; // Slightly slower pacing
            utterance.pitch = 1.0;

            // Try to find a premium/natural English voice if available on the user's OS
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => 
                v.lang.startsWith("en-") && 
                (v.name.includes("Google") || v.name.includes("Siri") || v.name.includes("Natural") || v.name.includes("Premium"))
            );
            if (preferredVoice) utterance.voice = preferredVoice;

            window.speechSynthesis.speak(utterance);
        }

        // Cleanup: stop talking if the user closes the modal or navigates away
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [currentStep, isPlaying, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
            if (currentStep === steps.length - 2) setCelebrate(true);
        }
    };

    const handleBack = () => {
        setCelebrate(false);
        if (currentStep > -1) setCurrentStep((prev) => prev - 1);
    };

    const getMascotMessage = () => {
        if (currentStep === -1) return MASCOT_MESSAGES[0];
        if (currentStep === steps.length - 1) return MASCOT_MESSAGES[5];
        if (currentStep % 2 === 0) return MASCOT_MESSAGES[2];
        return MASCOT_MESSAGES[3];
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-2xl flex flex-col items-center justify-start p-4 md:p-6 overflow-y-auto pt-10 md:pt-14">
            {/* Celebration Confetti (Motion Based) */}
            <AnimatePresence>
                {celebrate && (
                    <div className="fixed inset-0 pointer-events-none z-[110]">
                        {[...Array(24)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    top: "100%",
                                    left: `${Math.random() * 100}%`,
                                    opacity: 1,
                                    scale: 0.5
                                }}
                                animate={{
                                    top: "-10%",
                                    left: `${Math.random() * 100}%`,
                                    opacity: 0,
                                    rotate: 360,
                                    scale: 1.5
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    ease: "easeOut",
                                    delay: Math.random() * 1
                                }}
                                className="absolute"
                            >
                                <Star className={`w-8 h-8 ${i % 2 === 0 ? 'text-yellow-400' : 'text-indigo-400'}`} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Header / Close button */}
            <div className="fixed top-3 right-3 z-[120]">
                <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0 shadow-2xl">
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Content Container */}
            <div className="w-full max-w-5xl flex flex-col space-y-4 pb-12">
                {/* Chalkboard / Canvas */}
                <div className="relative w-full min-h-[350px] md:min-h-[420px] bg-[#1a2233] rounded-[2rem] border-[6px] border-slate-800 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.7)] flex flex-col p-4 md:p-8 overflow-hidden">
                    {/* Chalkboard Texture */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-chalkboard.png')]" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />

                    <AnimatePresence mode="wait">
                        {currentStep === -1 ? (
                            <motion.div
                                key="intro"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                                className="flex flex-col items-center justify-center flex-1 text-center space-y-4 py-4"
                            >
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl"
                                >
                                    <Bot className="w-12 h-12 text-white" />
                                </motion.div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                                        Math Magic! ✨
                                    </h2>
                                    <p className="text-lg md:text-xl text-slate-400 font-semibold max-w-lg mx-auto">
                                        Let's solve this together.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 30, filter: "blur(5px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, x: -30, filter: "blur(5px)" }}
                                className="flex flex-col flex-1 space-y-4 relative z-10"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                                            {currentStep + 1}
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                            {steps[currentStep].title}
                                        </h3>
                                    </div>
                                    <div className="hidden lg:block text-slate-500 font-black tracking-widest text-[10px] uppercase opacity-40">
                                        Sequence
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center space-y-4 py-2">
                                    <motion.div
                                        key={`math-${currentStep}`}
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "auto", opacity: 1 }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        className="text-xl md:text-3xl lg:text-4xl text-white font-serif bg-slate-800/60 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-inner overflow-visible relative group max-w-full"
                                    >
                                        {/* Handwriting Reveal Mask */}
                                        <motion.div
                                            initial={{ x: "-100%" }}
                                            animate={{ x: "100%" }}
                                            transition={{ duration: 1.5, ease: "linear" }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                                        />
                                        <div className="overflow-x-auto overflow-y-hidden py-1 px-1">
                                            <KatexRenderer equation={steps[currentStep].math} block />
                                        </div>
                                    </motion.div>

                                    <motion.p
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8 }}
                                        className="text-base md:text-xl text-slate-200 text-center max-w-2xl leading-relaxed font-bold bg-slate-900/40 px-6 py-3 rounded-[1.2rem] border border-white/5 backdrop-blur-md"
                                    >
                                        &ldquo;{steps[currentStep].explanation.replace(/\$/g, "")}&rdquo;
                                    </motion.p>
                                </div>

                                {steps[currentStep].tip && (
                                    <motion.div
                                        initial={{ scale: 0.98, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 1.2 }}
                                        className="bg-gradient-to-br from-amber-500/15 to-orange-600/15 border border-amber-500/10 p-3 rounded-[1.2rem] flex items-center gap-3 shadow-xl"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-amber-100 text-[10px] md:text-sm font-medium">
                                                <span className="font-black uppercase text-[8px] tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded-full mr-2">Tip</span>
                                                {steps[currentStep].tip?.replace(/\$/g, "")}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Timeline & Controls Row */}
                <div className="flex flex-col items-center space-y-4">
                    {/* Final Return Button (Appears when celebration starts) */}
                    <AnimatePresence>
                        {celebrate && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="w-full flex justify-center pb-2"
                            >
                                <Button
                                    onClick={onClose}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-6 rounded-2xl shadow-[0_15px_30px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2 group transition-all"
                                >
                                    <SkipBack className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    Back to Main Screen
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                        {steps.map((_, i) => (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    backgroundColor: i <= currentStep ? "#6366f1" : "transparent",
                                    flex: i === currentStep ? 2 : 1
                                }}
                                className="h-full rounded-full transition-all duration-700 mx-0.5"
                            />
                        ))}
                    </div>

                    <div className="flex items-center justify-between w-full px-2">
                        {/* Mascot - Moved here so it never overlaps the canvas */}
                        <div className="flex items-center gap-2">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/10"
                            >
                                <Bot className="w-6 h-6 md:w-7 md:h-7 text-white" />
                            </motion.div>
                            <motion.div
                                key={getMascotMessage()}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white text-slate-900 px-3 py-1.5 rounded-xl rounded-bl-none text-[10px] font-black shadow-xl relative hidden sm:block"
                            >
                                {getMascotMessage()}
                                <div className="absolute bottom-1 -left-1 w-2.5 h-2.5 bg-white rotate-45" />
                            </motion.div>
                        </div>

                        {/* Player Controls */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                disabled={currentStep < 0}
                                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-lg w-10 h-10 p-0"
                            >
                                <SkipBack className="w-6 h-6" />
                            </Button>

                            <Button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="bg-white text-slate-900 hover:scale-105 active:scale-95 rounded-full w-14 h-14 p-0 shadow-xl transition-all"
                            >
                                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={handleNext}
                                disabled={currentStep >= steps.length - 1}
                                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-lg w-10 h-10 p-0"
                            >
                                <SkipForward className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Complete Status */}
                        <div className="hidden sm:flex flex-col items-end opacity-40">
                            <p className="text-[8px] font-black tracking-[0.2em] uppercase mb-0.5">Status</p>
                            <p className="text-[10px] font-black text-white">{celebrate ? "Complete!" : isPlaying ? "Animating" : "Paused"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
