"use client";

import { useState, useRef, useEffect } from "react";
// Remove Lucide icons that were placeholders in previous call if not needed
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Upload, Camera, Keyboard, AlertTriangle, Flame, Trophy } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import SolutionView from "@/components/SolutionView";
import HistorySidebar from "@/components/HistorySidebar";
import { processImage } from "@/lib/image";
import { solveMathProblem, generatePracticeProblem } from "@/services/math";
import { getUserStats, UserStats, saveToHistory } from "@/services/storage";
import { MathSolution } from "@/services/types";

export default function Dashboard() {
    const [view, setView] = useState<"dashboard" | "camera" | "solution">("dashboard");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [solution, setSolution] = useState<MathSolution | null>(null);
    const [manualInput, setManualInput] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);
    const [stats, setStats] = useState<UserStats | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (view === "dashboard") {
            getUserStats().then(setStats);
        }
    }, [view]);

    const handleSolve = async (text: string, image?: string) => {
        setLoading(true);
        setError("");
        try {
            const sol = await solveMathProblem(text, image);
            // Attach original inputs
            sol.originalImage = image;
            sol.originalText = text;

            setSolution(sol);
            await saveToHistory(sol);
            setView("solution");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageFile = async (file: File) => {
        try {
            setLoading(true);
            setError("");
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

    return (
        <div className="w-full max-w-2xl mx-auto p-4 space-y-8 min-h-screen flex flex-col">
            <HistorySidebar onSelect={onHistorySelect} />

            <header className="flex flex-col items-center justify-center space-y-2 mt-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Math Tutor</h1>

                {stats && (
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full font-semibold text-sm border border-orange-100 shadow-sm transition-all hover:scale-105">
                            <Flame className="w-4 h-4" />
                            <span>{stats.streak} Day Streak</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-semibold text-sm border border-blue-100 shadow-sm transition-all hover:scale-105">
                            <Trophy className="w-4 h-4" />
                            <span>Level {stats.level} ({stats.xp} XP)</span>
                        </div>
                    </div>
                )}
            </header>

            <main className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-8 flex-1 flex flex-col justify-center">
                {loading ? (
                    <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-gray-500 font-medium">Analyzing problem...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                How would you like to start?
                            </h2>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                Upload a photo of your math problem or enter it manually.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Button
                                variant="outline"
                                className="h-40 flex flex-col gap-3 border-dashed border-2 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                                    <Upload className="w-6 h-6 text-gray-600 group-hover:text-indigo-600" />
                                </div>
                                <span className="font-medium text-gray-700 group-hover:text-indigo-700">Upload Image</span>
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

                            <Button
                                variant="outline"
                                className="h-40 flex flex-col gap-3 border-dashed border-2 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                onClick={() => setView("camera")}
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                                    <Camera className="w-6 h-6 text-gray-600 group-hover:text-indigo-600" />
                                </div>
                                <span className="font-medium text-gray-700 group-hover:text-indigo-700">Use Camera</span>
                            </Button>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-3 text-gray-400 font-medium">Or</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {!showManualInput ? (
                                <Button
                                    variant="secondary"
                                    className="w-full h-12 text-lg"
                                    onClick={() => setShowManualInput(true)}
                                >
                                    <Keyboard className="mr-2 w-5 h-5" />
                                    Type Problem
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <Input
                                        placeholder="E.g. Solve 2x + 5 = 15"
                                        value={manualInput}
                                        onChange={(e) => setManualInput(e.target.value)}
                                        className="h-12 text-lg"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            className="flex-1"
                                            onClick={() => setShowManualInput(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            disabled={!manualInput.trim()}
                                            onClick={() => handleSolve(manualInput)}
                                        >
                                            Solve It
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
