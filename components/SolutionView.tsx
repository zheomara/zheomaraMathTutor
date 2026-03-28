"use client";

import { MathSolution } from "@/services/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Download, RefreshCw, Play, BookOpen } from "lucide-react";
import KatexRenderer from "@/components/KatexRenderer";
import InlineMathText from "@/components/InlineMathText";
import { explainConcept } from "@/services/math";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Visualizer from "./Visualizer";
import SocraticChat from "./SocraticChat";
import Confetti from "./Confetti";
import { updateUserStats } from "@/services/storage";
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { HelpCircle, ChevronRight, Check, Flame, Trophy } from "lucide-react";

interface SolutionViewProps {
    solution: MathSolution;
    onBack: () => void;
    onGeneratePractice: () => void;
}

const uiTranslations: Record<string, any> = {
    English: {
        back_to_dashboard: "Back to Dashboard",
        watch_animation: "Watch Animation",
        confidence: "Confidence",
        problem: "Problem",
        solve_it_now: "Solve it now! Select the correct answer:",
        correct_excelent: "🎉 Correct! Excellent work. Here is the step-by-step breakdown.",
        check_basics: "Check your basics!",
        prerequisites_needed: "Prerequisites Needed",
        teach: "Teach",
        i_know: "I Know",
        consulting: "Consulting the Tutor Guide...",
        tutor_tip: "Tutor Tip",
        example: "Example",
        i_understand_now: "I understand now!",
        step_by_step: "Step-by-Step Solution",
        prereqs_cleared: "Prerequisites Cleared! 🚀",
        tip: "💡 Tip:",
        reveal_next: "Reveal Next Step",
        left: "left",
        final_answer: "Final Answer",
        solution_locked: "Solution Locked",
        review_prereqs: "Review the prerequisites above to unlock the step-by-step breakdown!",
        download_pdf: "Download PDF",
        animation: "Animation",
        practice_similar: "Practice Similar"
    }
};

export default function SolutionView({ solution, onBack, onGeneratePractice }: SolutionViewProps) {
    const t = uiTranslations.English;
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
    const [acknowledgedConcepts, setAcknowledgedConcepts] = useState<string[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [xpPopup, setXpPopup] = useState<number | null>(null);
    const [levelUp, setLevelUp] = useState<number | null>(null);

    const isGateOpen = !solution.assumedKnowledge || solution.assumedKnowledge.length === 0 ||
        solution.assumedKnowledge.every(item => learnedConcepts.includes(item) || acknowledgedConcepts.includes(item));

    // Reset when a new solution is loaded
    useEffect(() => {
        setRevealedSteps(1);
        setQuizState(solution.quizOptions ? 'playing' : null);
        setWrongAnswers([]);
        setShakingOption(null);
        setTeachingConcept(null);
        setExplainedData(null);
        setAcknowledgedConcepts([]);
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

    const markAsAcknowledged = (concept: string) => {
        setAcknowledgedConcepts(prev => [...prev, concept]);
    };

    const handleQuizClick = async (id: string, isCorrect: boolean) => {
        if (isCorrect) {
            setQuizState('passed');
            setShowConfetti(true);
            const stats = await updateUserStats(10); // Reward 10 XP for correct answer
            setXpPopup(10);
            if (stats.didLevelUp) {
                setLevelUp(stats.level);
            }
            setTimeout(() => setXpPopup(null), 3000);
        } else {
            setWrongAnswers(prev => [...prev, id]);
            setShakingOption(id);
            setTimeout(() => setShakingOption(null), 500);
        }
    };

    const handleRevealStep = async () => {
        const nextStep = revealedSteps + 1;
        setRevealedSteps(nextStep);

        // Award XP for reaching the final answer if not already in quiz mode
        if (nextStep === solution.steps.length && !solution.quizOptions) {
            const stats = await updateUserStats(15);
            setXpPopup(15);
            if (stats.didLevelUp) {
                setLevelUp(stats.level);
                setShowConfetti(true);
            }
            setTimeout(() => setXpPopup(null), 3000);
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
            <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

            <AnimatePresence>
                {xpPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: -40, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-400 to-yellow-400 text-white px-6 py-3 rounded-full font-black shadow-xl z-50 flex items-center gap-2"
                    >
                        <Flame className="w-5 h-5 fill-white" />
                        +{xpPopup} XP
                    </motion.div>
                )}

                {levelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 flex items-center justify-center z-[110] bg-black/40 backdrop-blur-sm"
                        onClick={() => setLevelUp(null)}
                    >
                        <motion.div
                            className="bg-white p-12 rounded-[3rem] text-center space-y-6 shadow-2xl border-4 border-indigo-500"
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                        >
                            <Trophy className="w-24 h-24 text-yellow-500 mx-auto animate-bounce" />
                            <h2 className="text-5xl font-black text-gray-900">LEVEL UP!</h2>
                            <p className="text-2xl font-bold text-indigo-600">You reached Level {levelUp}</p>
                            <Button className="w-full h-16 text-xl rounded-2xl bg-indigo-600 font-bold" onClick={() => setLevelUp(null)}>
                                Keep Learning!
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="pl-0 hover:bg-transparent hover:text-indigo-600 font-bold">
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    {t.back_to_dashboard}
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
                        {t.watch_animation}
                    </Button>
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                        {t.confidence}: {Math.round(solution.confidence * 100)}%
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" id="solution-content">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.problem}</h2>
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
                            <InlineMathText text={solution.originalText || solution.transcription} />
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {quizState === 'playing' && solution.quizOptions ? (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-900 text-center">{t.solve_it_now}</h3>
                            <div className="flex flex-col gap-2">
                                {solution.quizOptions.map((opt) => {
                                    const isWrong = wrongAnswers.includes(opt.id);
                                    const isShaking = shakingOption === opt.id;
                                    return (
                                        <motion.button
                                            key={opt.id}
                                            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            transition={{ duration: 0.3 }}
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
                                    {t.correct_excelent}
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                {solution.assumedKnowledge && solution.assumedKnowledge.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`p-6 rounded-[2rem] border-2 ${themeClass} space-y-6 shadow-xl shadow-indigo-50/50 bg-white/80 backdrop-blur-sm relative overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                                                    <span className="text-2xl">🧠</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{t.check_basics}</h3>
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t.prerequisites_needed}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-indigo-600 font-black bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase">Step 1 of 2</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {solution.assumedKnowledge.map((item, i) => {
                                                const isLearned = learnedConcepts.includes(item);
                                                const isAcknowledged = acknowledgedConcepts.includes(item);
                                                const isDone = isLearned || isAcknowledged;
                                                return (
                                                    <motion.div
                                                        key={i}
                                                        whileHover={!isDone ? { y: -2 } : {}}
                                                        className={`bg-white/90 backdrop-blur-md p-4 rounded-[1.25rem] border-2 transition-all flex flex-col gap-3 shadow-sm hover:shadow-md ${isDone ? 'border-green-200 bg-green-50/30' : 'border-gray-50 bg-white hover:border-indigo-100'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-50 text-gray-400 rotate-12'
                                                                    }`}>
                                                                    {isDone ? (
                                                                        <Check className="w-6 h-6 stroke-[3]" />
                                                                    ) : (
                                                                        <BookOpen className="w-5 h-5" />
                                                                    )}
                                                                </div>
                                                                <div className={`font-bold text-sm tracking-tight ${isDone ? 'text-green-700 opacity-80' : 'text-gray-900 line-clamp-1'}`}>
                                                                    <InlineMathText text={item} />
                                                                </div>
                                                            </div>

                                                            {!isDone && (
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleExplainConcept(item)}
                                                                        className="h-10 px-4 rounded-xl font-bold bg-white text-indigo-600 border-indigo-50 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs"
                                                                    >
                                                                        {t.teach}
                                                                    </Button>
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        onClick={() => markAsAcknowledged(item)}
                                                                        className="h-10 px-4 rounded-xl font-bold bg-gray-50 text-gray-500 shadow-sm hover:bg-white hover:text-green-600 transition-all text-xs"
                                                                    >
                                                                        {t.i_know}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
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
                                                            <p className="text-sm font-medium animate-pulse">{t.consulting}</p>
                                                        </div>
                                                    ) : explainedData && (
                                                        <div className="p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">{t.tutor_tip}</div>
                                                                <button onClick={() => setTeachingConcept(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <h4 className="text-lg font-bold text-indigo-900">{explainedData.title}</h4>
                                                                <InlineMathText text={explainedData.explanation} className="text-gray-700 leading-relaxed block" />
                                                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center gap-2">
                                                                    <div className="text-[10px] font-bold text-indigo-400 uppercase">{t.example}</div>
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
                                                                {t.i_understand_now}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {isGateOpen ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-gray-900">{t.step_by_step}</h3>
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 uppercase tracking-tighter">{t.prereqs_cleared}</span>
                                        </div>
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
                                                            <span className="font-bold">{t.tip}</span> <InlineMathText text={step.tip} />
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
                                                    onClick={handleRevealStep}
                                                    className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                                >
                                                    {t.reveal_next} ({solution.steps.length - revealedSteps} {t.left})
                                                </Button>
                                            </div>
                                        )}

                                        <div className={`text-center py-4 rounded-lg border mt-6 ${themeClass}`}>
                                            <h3 className="text-sm font-medium mb-1 opacity-80">{t.final_answer}</h3>
                                            <div className="text-2xl font-bold text-gray-900">
                                                <KatexRenderer equation={solution.answerLatex} block />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl grayscale">🔒</div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-bold text-gray-900">{t.solution_locked}</h3>
                                            <p className="text-sm text-gray-500 max-w-xs">{t.review_prereqs}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center max-w-4xl mx-auto z-40">
                <Button variant="outline" onClick={handleDownloadPDF}>
                    <Download className="mr-2 w-4 h-4" />
                    {t.download_pdf}
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowVisualizer(true)}
                        className="md:hidden flex items-center text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100"
                    >
                        <Play className="mr-2 w-3 h-3 fill-current" />
                        {t.animation}
                    </Button>
                    <Button onClick={onGeneratePractice}>
                        <RefreshCw className="mr-2 w-4 h-4" />
                        {t.practice_similar}
                    </Button>
                </div>
            </div>
        </div>
    );
}
