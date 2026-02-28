"use client";

import { MathSolution } from "@/services/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Download, RefreshCw, Play } from "lucide-react";
import KatexRenderer from "@/components/KatexRenderer";
import InlineMathText from "@/components/InlineMathText";
import { explainConcept } from "@/services/math";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Visualizer from "./Visualizer";
import SocraticChat from "./SocraticChat";
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { HelpCircle, ChevronRight, Check } from "lucide-react";

interface SolutionViewProps {
    solution: MathSolution;
    onBack: () => void;
    onGeneratePractice: () => void;
}

export default function SolutionView({ solution, onBack, onGeneratePractice }: SolutionViewProps) {
    const [showVisualizer, setShowVisualizer] = useState(false);
    const [revealedSteps, setRevealedSteps] = useState(1);

    // Quiz Mode States
    const [quizState, setQuizState] = useState<'playing' | 'passed' | null>(solution.quizOptions ? 'playing' : null);
    const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
    const [shakingOption, setShakingOption] = useState<string | null>(null);

    // Teaching Flow States
    const [teachingConcept, setTeachingConcept] = useState<string | null>(null);
    const [isTeachingLoading, setIsTeachingLoading] = useState(false);
    const [explainedData, setExplainedData] = useState<{ title: string; explanation: string; exampleMath: string } | null>(null);
    const [learnedConcepts, setLearnedConcepts] = useState<string[]>([]);

    // Reset when a new solution is loaded
    useEffect(() => {
        setRevealedSteps(1);
        setQuizState(solution.quizOptions ? 'playing' : null);
        setWrongAnswers([]);
        setShakingOption(null);
        setTeachingConcept(null);
        setExplainedData(null);
    }, [solution]);

    const handleExplainConcept = async (concept: string) => {
        setTeachingConcept(concept);
        setIsTeachingLoading(true);
        try {
            const data = await explainConcept(concept);
            setExplainedData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsTeachingLoading(false);
        }
    };

    const markAsLearned = (concept: string) => {
        setLearnedConcepts(prev => [...prev, concept]);
        setTeachingConcept(null);
        setExplainedData(null);
    };

    const handleQuizClick = (id: string, isCorrect: boolean) => {
        if (isCorrect) {
            setQuizState('passed');
        } else {
            setWrongAnswers(prev => [...prev, id]);
            setShakingOption(id);
            setTimeout(() => setShakingOption(null), 500);
        }
    };

    const getThemeColors = (subject?: string) => {
        const s = subject?.toLowerCase() || "";
        if (s.includes("algebra")) return "text-green-700 bg-green-50 border-green-200 fill-green-600";
        if (s.includes("geometry")) return "text-purple-700 bg-purple-50 border-purple-200 fill-purple-600";
        if (s.includes("calculus")) return "text-red-700 bg-red-50 border-red-200 fill-red-600";
        return "text-indigo-700 bg-indigo-50 border-indigo-200 fill-indigo-600"; // default
    };

    const themeClass = getThemeColors(solution.subject);
    const themeBtn = themeClass.split(' ')[0].replace('text-', 'bg-');

    const handleDownloadPDF = async () => {
        const element = document.getElementById("solution-content");
        if (!element) return;

        try {
            // 1. Ensure all fonts are loaded
            if (document.fonts) {
                await document.fonts.ready;
            }

            // 2. Force a reflow to ensure everything is rendered
            document.body.offsetHeight;

            // 3. Wait a bit for KaTeX and fonts to fully settle
            await new Promise((r) => setTimeout(r, 1000));

            // 4. Capture with high scale for clarity
            const captureWidth = 1000;
            const canvas = await html2canvas(element, {
                scale: 3, // Increased to 3 as requested
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                windowWidth: captureWidth,
                onclone: (clonedDoc: Document) => {
                    const clonedElement = clonedDoc.getElementById("solution-content");
                    if (clonedElement) {
                        clonedElement.style.width = `${captureWidth}px`;
                        clonedElement.style.padding = "40px";
                        clonedElement.style.margin = "0";

                        // Fix KaTeX alignment in clone
                        const katexElems = clonedElement.querySelectorAll(".katex-display, .katex");
                        katexElems.forEach((el) => {
                            (el as HTMLElement).style.fontSize = "1.2rem";
                            (el as HTMLElement).style.lineHeight = "1.5";
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95); // High quality
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // First page
            pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;

            // Subsequent pages
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
            }

            const fileName = `Math_Solution_${new Date().getTime()}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = pdf.output("datauristring").split(',')[1];
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: Directory.Cache,
                });

                await Share.share({
                    title: 'Math Solution PDF',
                    url: result.uri,
                    dialogTitle: 'Share or Save PDF',
                });
            } else {
                pdf.save(fileName);
            }
        } catch (err) {
            console.error("PDF Export failed", err);
            alert("Failed to export PDF. Please try again.");
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6 pb-20">
            {showVisualizer && (
                <Visualizer
                    solution={solution}
                    onClose={() => setShowVisualizer(false)}
                />
            )}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="pl-0 hover:bg-transparent hover:text-indigo-600">
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back to Dashboard
                </Button>
                <div className="flex items-center gap-2">
                    {solution.subject && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border ${themeClass}`}>
                            {solution.subject}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVisualizer(true)}
                        className={`hidden md:flex items-center hover:opacity-80 border ${themeClass}`}
                    >
                        <Play className="mr-2 w-3 h-3 fill-current" />
                        Watch Animation
                    </Button>
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                        Confidence: {Math.round(solution.confidence * 100)}%
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" id="solution-content">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Problem</h2>
                    <div className="text-lg text-gray-900 font-medium whitespace-pre-wrap">
                        {solution.originalImage ? (
                            <div className="max-w-md bg-white p-2 rounded-lg border border-gray-200 shadow-sm mx-auto">
                                <img
                                    src={solution.originalImage}
                                    alt="Original problem"
                                    className="max-h-64 mx-auto rounded"
                                />
                            </div>
                        ) : (
                            <KatexRenderer equation={solution.originalText || solution.transcription} />
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {quizState === 'playing' && solution.quizOptions ? (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-900 text-center">Solve it now! Select the correct answer:</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {solution.quizOptions.map((opt) => {
                                    const isWrong = wrongAnswers.includes(opt.id);
                                    const isShaking = shakingOption === opt.id;
                                    return (
                                        <motion.button
                                            key={opt.id}
                                            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            transition={{ duration: 0.4 }}
                                            onClick={() => handleQuizClick(opt.id, opt.isCorrect)}
                                            disabled={isWrong}
                                            className={`p-6 rounded-xl border-2 transition-all duration-300 flex items-center justify-center font-medium text-lg min-h-[100px]
                                                ${isWrong ? 'border-red-400 bg-red-50 opacity-50' : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md cursor-pointer'} 
                                            `}
                                        >
                                            <KatexRenderer equation={opt.mathLatex} />
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {quizState === 'passed' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-xl text-center font-bold text-lg mb-6 shadow-sm flex flex-col items-center justify-center gap-2"
                                >
                                    <span className="text-3xl">🎉</span>
                                    Correct! Excellent work. Here is the step-by-step breakdown.
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                {solution.assumedKnowledge && solution.assumedKnowledge.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-xl border ${themeClass} space-y-4 shadow-sm`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                                <span className="text-lg">🧠</span> Before you start...
                                            </h3>
                                            <span className="text-xs opacity-60 italic">Make sure you know these first!</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {solution.assumedKnowledge.map((item, i) => {
                                                const isLearned = learnedConcepts.includes(item);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`bg-white/70 backdrop-blur-sm p-3 rounded-xl border transition-all flex flex-col gap-2 
                                                            ${isLearned ? 'border-green-200 bg-green-50/50' : 'border-current/10'}
                                                        `}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2 font-medium text-sm">
                                                                {isLearned ? (
                                                                    <div className="bg-green-500 rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>
                                                                ) : (
                                                                    <div className="w-4 h-4 rounded-full border border-current/20" />
                                                                )}
                                                                <InlineMathText text={item} />
                                                            </div>
                                                            {!isLearned && (
                                                                <button
                                                                    onClick={() => handleExplainConcept(item)}
                                                                    className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-white border shadow-sm hover:bg-gray-50 flex items-center gap-1 active:scale-95 transition-transform"
                                                                >
                                                                    <HelpCircle className="w-3 h-3" />
                                                                    I don't know this
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <AnimatePresence>
                                            {teachingConcept && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-white rounded-xl border-2 border-indigo-200 overflow-hidden shadow-lg"
                                                >
                                                    {isTeachingLoading ? (
                                                        <div className="p-8 flex flex-col items-center justify-center gap-3">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                                            <p className="text-sm font-medium animate-pulse">Consulting the Tutor Guide...</p>
                                                        </div>
                                                    ) : explainedData && (
                                                        <div className="p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Tutor Tip</div>
                                                                <button onClick={() => setTeachingConcept(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <h4 className="text-lg font-bold text-indigo-900">{explainedData.title}</h4>
                                                                <InlineMathText text={explainedData.explanation} className="text-gray-700 leading-relaxed block" />
                                                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center gap-2">
                                                                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Example</div>
                                                                    <div className="text-xl">
                                                                        <KatexRenderer equation={explainedData.exampleMath} block />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => markAsLearned(teachingConcept)}
                                                                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md py-6 rounded-xl"
                                                            >
                                                                <Check className="mr-2 w-5 h-5" />
                                                                I understand now!
                                                            </Button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                <h3 className="text-lg font-bold text-gray-900">Step-by-Step Solution</h3>
                                {solution.steps.slice(0, revealedSteps).map((step, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            {index < solution.steps.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-gray-200 my-2" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3 pb-6">
                                            <h4 className="font-semibold text-gray-900">{step.title}</h4>
                                            <InlineMathText text={step.explanation} className="text-gray-600 leading-relaxed block" />
                                            {step.math && (
                                                <div className="bg-gray-50 p-3 rounded-md border border-gray-100 overflow-x-auto">
                                                    <KatexRenderer equation={step.math} />
                                                </div>
                                            )}
                                            {step.tip && (
                                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-100 flex gap-2">
                                                    <span className="font-bold">💡 Tip:</span> <InlineMathText text={step.tip} />
                                                </div>
                                            )}
                                            <SocraticChat
                                                problemText={solution.originalText || solution.transcription}
                                                stepContext={step.explanation}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {revealedSteps < solution.steps.length && (
                                    <div className="flex justify-center pt-4 border-t border-gray-100">
                                        <Button
                                            onClick={() => setRevealedSteps(prev => prev + 1)}
                                            className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                        >
                                            Reveal Next Step ({solution.steps.length - revealedSteps} left)
                                        </Button>
                                    </div>
                                )}

                                <div className={`text-center py-4 rounded-lg border mt-6 ${themeClass}`}>
                                    <h3 className="text-sm font-medium mb-1 opacity-80">Final Answer</h3>
                                    <div className="text-2xl font-bold text-gray-900">
                                        <KatexRenderer equation={solution.answerLatex} block />
                                    </div>
                                </div>
                            </div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center max-w-4xl mx-auto z-40">
                <Button variant="outline" onClick={handleDownloadPDF}>
                    <Download className="mr-2 w-4 h-4" />
                    Download PDF
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowVisualizer(true)}
                        className="md:hidden flex items-center text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100"
                    >
                        <Play className="mr-2 w-3 h-3 fill-current" />
                        Animation
                    </Button>
                    <Button onClick={onGeneratePractice}>
                        <RefreshCw className="mr-2 w-4 h-4" />
                        Practice Similar
                    </Button>
                </div>
            </div>
        </div>
    );
}
