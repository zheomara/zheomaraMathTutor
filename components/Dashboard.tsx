"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Upload, Camera, Keyboard, AlertTriangle, Flame, Trophy } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import SolutionView from "@/components/SolutionView";
import HistorySidebar from "@/components/HistorySidebar";
import { getInternetNow } from "@/lib/time";
import AccessGate from "./AccessGate";
import TOSModal from "./TOSModal";
import { processImage } from "@/lib/image";
import { solveMathProblem, generatePracticeProblem } from "@/services/math";
import { getUserStats, UserStats, saveToHistory, getFreeTries, incrementFreeTries } from "@/services/storage";
import { MathSolution } from "@/services/types";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Preferences } from "@capacitor/preferences";

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};

const uiTranslations = {
    English: {
        ready: "Ready to learn?",
        uploadSub: "Upload a photo of your problem or type it in! Our AI will teach you step-by-step.",
        upload: "Upload Photo",
        camera: "Take Camera",
        or: "or",
        typeProblem: "Type Problem",
        placeholder: "E.g. Solve 5 + 5",
        back: "Back",
        start: "Start Teaching!",
        thinking: "AI is Thinking...",
        streak: "Day Streak",
        level: "Level",
        xpTo: "XP to Level"
    }
};

export default function Dashboard() {
    const router = useRouter();
    const [view, setView] = useState<"dashboard" | "camera" | "solution">("dashboard");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [solution, setSolution] = useState<MathSolution | null>(null);
    const [manualInput, setManualInput] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);
    const [stats, setStats] = useState<UserStats | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGateOpen, setIsGateOpen] = useState(false);
    const [tosAccepted, setTosAccepted] = useState(true);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [prefetchedPractice, setPrefetchedPractice] = useState<MathSolution | null>(null);
    const [isPrefetching, setIsPrefetching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const t = uiTranslations.English;

    useEffect(() => {
        if (view === "dashboard") {
            getUserStats().then(setStats);
            const tos = localStorage.getItem("tosAccepted");
            if (tos !== "true") {
                setTosAccepted(false);
            }
        }
    }, [view]);

    const handleDashboardLongPress = () => {
        const adminPass = window.prompt("Enter Admin Password:");
        if (adminPass === "Matipa@2021") {
            router.push('/admin-generator');
        } else if (adminPass) {
            alert("Incorrect password.");
        }
    };

    const handlePressStart = () => {
        const timer = setTimeout(handleDashboardLongPress, 2000);
        setPressTimer(timer);
    };

    const handlePressEnd = () => {
        if (pressTimer) clearTimeout(pressTimer);
    };

    const checkSubscriptionOrTrial = async (skipIncrement: boolean = false): Promise<boolean> => {
        try {
            const expiryStr = localStorage.getItem("licenseExpiry");
            if (expiryStr) {
                const expiry = new Date(expiryStr);
                if (!isNaN(expiry.getTime())) {
                    const now = await getInternetNow();
                    if (now < expiry) {
                        console.log("Valid license found! Returning true.");
                        return true;
                    }
                }
                console.log("License expired or invalid.");
                localStorage.removeItem("licenseExpiry");
            }

            const freeTries = await getFreeTries();
            console.log("Current free tries:", freeTries);
            if (freeTries < 2) {
                if (!skipIncrement) {
                    await incrementFreeTries();
                    console.log("Incremented free tries to", freeTries + 1);
                }
                return true;
            }

            console.log("Opening gate!");
            setIsGateOpen(true);
            return false;
        } catch (err) {
            console.error("Error in check:", err);
            setIsGateOpen(true);
            return false;
        }
    };

    // Background Pre-fetching for Practice Problems
    useEffect(() => {
        if (view === "solution" && solution && !prefetchedPractice && !isPrefetching) {
            const prefetch = async () => {
                try {
                    setIsPrefetching(true);
                    console.log("Pre-fetching practice problem in background...");
                    const sol = await generatePracticeProblem(solution.transcription);
                    setPrefetchedPractice(sol);
                    console.log("Practice problem pre-fetched successfully.");
                } catch (err) {
                    console.warn("Background pre-fetch failed:", err);
                } finally {
                    setIsPrefetching(false);
                }
            };
            prefetch();
        }
    }, [view, solution, prefetchedPractice, isPrefetching]);

    const handleSolve = async (text: string, image?: string, isRetry: boolean = false) => {
        if (!text && !image) return;

        setLoading(true);
        setError("");
        if (!isRetry) setSolution(null);
        setPrefetchedPractice(null);

        const canSolve = await checkSubscriptionOrTrial();
        if (!canSolve) {
            setLoading(false);
            setIsUploading(false);
            return;
        }

        try {
            const sol = await solveMathProblem(text, image);
            sol.originalImage = image;
            sol.originalText = text;
            setIsUploading(false); // Done uploading once we get a response
            setSolution(sol);
            await saveToHistory(sol);
            setView("solution");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
            setIsUploading(false);
        }
    };

    const handleImageFile = async (file: File) => {
        try {
            setLoading(true);
            setError("");
            setIsUploading(true);
            const base64 = await processImage(file);
            await handleSolve("", base64);
        } catch (err) {
            console.error(err);
            setError("Failed to process image.");
            setLoading(false);
        }
    };

    const onHistorySelect = (item: MathSolution) => {
        setSolution(item);
        setView("solution");
    };

    const handleGeneratePractice = async () => {
        if (!solution) return;

        // If we have a pre-fetched solution, use it instantly!
        if (prefetchedPractice) {
            console.log("Serving pre-fetched practice problem.");
            setSolution(prefetchedPractice);
            await saveToHistory(prefetchedPractice);
            setPrefetchedPractice(null); // Clear for next one
            setView("solution");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const sol = await generatePracticeProblem(solution.transcription);
            setSolution(sol);
            await saveToHistory(sol);
            setView("solution");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to generate practice problem.");
        } finally {
            setLoading(false);
        }
    };

    if (view === "camera") {
        return (
            <CameraCapture
                onCapture={(file) => {
                    setView("dashboard");
                    handleImageFile(file);
                }}
                onClose={() => setView("dashboard")}
            />
        );
    }

    if (view === "solution" && solution) {
        return (
            <SolutionView
                solution={solution}
                onBack={() => setView("dashboard")}
                onGeneratePractice={handleGeneratePractice}
            />
        );
    }

    if (!tosAccepted) {
        return <TOSModal onAccept={() => {
            localStorage.setItem("tosAccepted", "true");
            setTosAccepted(true);
        }} />;
    }

    return (
        <div className="w-full min-h-screen bg-[#fafafa] relative overflow-hidden flex flex-col">
            <AccessGate isOpen={isGateOpen} onSuccess={() => setIsGateOpen(false)} />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50 pointer-events-none" />

            <div className="w-full max-w-2xl mx-auto p-6 space-y-8 flex-1 flex flex-col relative z-10">
                <HistorySidebar onSelect={onHistorySelect} />

                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center space-y-3 mt-8"
                >
                    <h1
                        className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 cursor-pointer select-none"
                        onMouseDown={handlePressStart}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={handlePressStart}
                        onTouchEnd={handlePressEnd}
                    >
                        Math Tutor
                    </h1>

                    {stats && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex gap-3 mt-1">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        transition: { repeat: Infinity, duration: 2 }
                                    }}
                                    className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl font-bold text-sm border border-orange-100 shadow-sm"
                                >
                                    <Flame className="w-4 h-4 fill-orange-500" />
                                    <span>{stats.streak} {t.streak}</span>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl font-bold text-sm border border-indigo-100 shadow-sm"
                                >
                                    <Trophy className="w-4 h-4 fill-indigo-500" />
                                    <span>{t.level} {stats.level}</span>
                                </motion.div>
                            </div>

                            <div className="w-48 bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.xp % 100}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stats.xp % 100} / 100 {t.xpTo} {stats.level + 1}</span>
                        </div>
                    )}
                </motion.header>

                <motion.main
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 p-8 sm:p-12 text-center space-y-10 flex-1 flex flex-col justify-center"
                >
                    {loading ? (
                        <div className="w-full h-full flex flex-col space-y-8 animate-pulse">
                            {/* Transcription Skeleton */}
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-200 rounded-full w-24 mx-auto" />
                                <div className="h-8 bg-gray-100 rounded-2xl w-full" />
                            </div>

                            {/* Quiz Options Skeleton */}
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-24 bg-gray-50 rounded-2xl border-2 border-gray-100/50" />
                                ))}
                            </div>

                            {/* Steps Skeleton */}
                            <div className="space-y-6 pt-4">
                                <div className="h-6 bg-gray-100 rounded-full w-48" />
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="h-4 bg-gray-100 rounded-full w-1/3" />
                                        <div className="h-20 bg-gray-50 rounded-2xl" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center pt-4">
                                <p className="text-indigo-400 font-bold text-lg animate-bounce">
                                    {isUploading ? 'Uploading Problem...' : 'AI is Thinking...'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <motion.div variants={itemVariants} className="space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    {t.ready}
                                </h2>
                                <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
                                    {t.uploadSub}
                                </p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        variant="outline"
                                        className="w-full h-44 flex flex-col gap-4 border-2 border-indigo-50/50 bg-indigo-50/30 hover:bg-white hover:border-indigo-500 transition-all rounded-[2rem] shadow-sm hover:shadow-xl group overflow-hidden relative"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <Upload className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <span className="font-bold text-gray-900 text-lg">{t.upload}</span>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
                                            }}
                                        />
                                    </Button>
                                </motion.div>

                                <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        variant="outline"
                                        className="w-full h-44 flex flex-col gap-4 border-2 border-blue-50/50 bg-blue-50/30 hover:bg-white hover:border-blue-500 transition-all rounded-[2rem] shadow-sm hover:shadow-xl group overflow-hidden relative"
                                        onClick={() => setView("camera")}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <Camera className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <span className="font-bold text-gray-900 text-lg">{t.camera}</span>
                                    </Button>
                                </motion.div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-100" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">{t.or}</span>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-4">
                                <AnimatePresence mode="wait">
                                    {!showManualInput ? (
                                        <motion.div
                                            key="type-button"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                        >
                                            <Button
                                                variant="secondary"
                                                className="w-full h-14 text-xl rounded-3xl bg-gray-50 border-2 border-gray-100/50 hover:bg-white hover:border-indigo-200 text-black transition-all shadow-sm"
                                                onClick={() => setShowManualInput(true)}
                                            >

                                                <Keyboard className="mr-3 w-6 h-6" />
                                                {t.typeProblem}
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="manual-input"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-4"
                                        >
                                            <Input
                                                placeholder={t.placeholder}
                                                value={manualInput}
                                                onChange={(e) => setManualInput(e.target.value)}
                                                className="h-16 text-xl rounded-[1.5rem] border-2 focus:border-indigo-500 shadow-inner px-6"
                                                autoFocus
                                            />
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-14 rounded-2xl text-gray-500 hover:bg-gray-100"
                                                    onClick={() => setShowManualInput(false)}
                                                >
                                                    {t.back}
                                                </Button>
                                                <Button
                                                    className="flex-[2] h-14 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-200"
                                                    disabled={!manualInput.trim()}
                                                    onClick={() => handleSolve(manualInput)}
                                                >
                                                    {t.start}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-center gap-2 text-red-500 bg-red-50 p-4 rounded-3xl text-sm font-bold border border-red-100"
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                    {error}
                                </motion.div>
                            )}
                        </>
                    )}
                </motion.main>
            </div>
        </div>
    );
}
