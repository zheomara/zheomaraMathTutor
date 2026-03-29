"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, Play, BookOpen } from 'lucide-react';
import { MathSolution } from '@/services/types';
import InlineMathText from './InlineMathText';
import { Button } from './ui/Button';
import HomeworkGuideDialog from './HomeworkGuideDialog';
import SolutionView from './SolutionView';

interface HomeworkViewProps {
    solutions: MathSolution[];
    onBack: () => void;
}

export default function HomeworkView({ solutions, onBack }: HomeworkViewProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [showGuide, setShowGuide] = useState(false);

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-8 pb-32">
            
            {showGuide && (
                <HomeworkGuideDialog solutions={solutions} onClose={() => setShowGuide(false)} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <Button variant="ghost" onClick={onBack} className="hover:bg-slate-100 font-bold text-slate-700">
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    Back
                </Button>
                <div className="text-center">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Homework Master</h1>
                    <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest">{solutions.length} Problems Solved</p>
                </div>
                <div className="w-[88px]"></div> {/* Spacer for centering */}
            </div>

            {/* Problems Accordion */}
            <div className="space-y-4">
                {solutions.map((sol, index) => {
                    const isExpanded = expandedIndex === index;
                    return (
                        <motion.div 
                            key={index} 
                            className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${isExpanded ? 'border-indigo-400 shadow-xl' : 'border-slate-200 shadow-sm hover:border-indigo-200'}`}
                        >
                            <button 
                                onClick={() => toggleExpand(index)}
                                className="w-full text-left p-6 flex items-center justify-between gap-4 focus:outline-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-lg line-clamp-1">
                                            <InlineMathText text={sol.originalText || sol.transcription} />
                                        </p>
                                        <p className="text-sm font-medium text-slate-400">{sol.subject}</p>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp className="w-6 h-6 text-indigo-400" /> : <ChevronDown className="w-6 h-6 text-slate-400" />}
                            </button>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                    >
                                        <div className="p-0 border-t border-slate-100 bg-slate-50/50 overflow-hidden">
                                            <div className="-mt-4">
                                                <SolutionView solution={sol} isInline={true} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Sticky Floating Generate Action */}
            <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center pointer-events-none">
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pointer-events-auto"
                >
                    <button 
                        onClick={() => setShowGuide(true)}
                        className="flex items-center gap-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white px-8 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:shadow-[0_10px_40px_-10px_rgba(79,70,229,0.7)] hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                        <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                        GENERATE ULTIMATE GUIDE
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
