"use client";

import { useState, useEffect } from "react";
import { Sheet, History as HistoryIcon, X, Clock } from "lucide-react";
// Note: 'Sheet' is not an icon, I meant a sidebar container. I'll build a custom one.
import { Button } from "@/components/ui/Button";
import { MathSolution } from "@/services/types";

interface HistoryItem {
    id: string;
    createdAt: string;
    transcription: string;
    data: MathSolution;
}

interface HistorySidebarProps {
    onSelect: (item: MathSolution) => void;
}

export default function HistorySidebar({ onSelect }: HistorySidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem("mathTutorHistory");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    // Sort by newest first
                    setHistory(parsed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                } catch (e) {
                    console.error("Failed to parse history", e);
                }
            }
        }
    }, [isOpen]);

    const toggle = () => setIsOpen(!isOpen);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="fixed top-4 right-4 z-40 bg-white shadow-sm border border-gray-200"
            >
                <HistoryIcon className="w-5 h-5 mr-2" />
                History
            </Button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                    onClick={toggle}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="font-bold text-lg text-gray-900">History</h2>
                    <Button variant="ghost" size="sm" onClick={toggle}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="overflow-y-auto h-[calc(100vh-64px)] p-4 space-y-3">
                    {history.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm mt-10">No history yet.</p>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => { onSelect(item.data); toggle(); }}
                                className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all"
                            >
                                <div className="flex items-center text-xs text-gray-400 mb-2">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <p className="text-sm font-medium text-gray-800 line-clamp-2">
                                    {item.transcription || "Unknown Problem"}
                                </p>
                                <div className="mt-2 text-xs text-indigo-600 font-semibold">
                                    View Solution →
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
