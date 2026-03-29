"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Download, BookOpen, Key, Lightbulb } from 'lucide-react';
import { MathSolution, HomeworkGuideData } from '@/services/types';
import { generateHomeworkGuide } from '@/services/math';
import KatexRenderer from './KatexRenderer';
import InlineMathText from './InlineMathText';
import { Button } from './ui/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface HomeworkGuideProps {
    solutions: MathSolution[];
    onClose: () => void;
}

export default function HomeworkGuideDialog({ solutions, onClose }: HomeworkGuideProps) {
    const [guide, setGuide] = useState<HomeworkGuideData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const guideRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                const data = await generateHomeworkGuide(solutions);
                setGuide(data);
            } catch (err: any) {
                setError(err.message || 'Failed to generate ultimate guide');
            } finally {
                setLoading(false);
            }
        };
        fetchGuide();
    }, [solutions]);

    const handleDownloadPDF = async () => {
        if (!guideRef.current) return;
        try {
            // Ensure all fonts are loaded
            if (document.fonts) {
                await document.fonts.ready;
            }

            // Force a reflow
            document.body.offsetHeight;

            // Wait a bit for KaTeX and fonts to fully settle
            await new Promise((r) => setTimeout(r, 1000));

            const canvas = await html2canvas(guideRef.current, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: "#ffffff",
                onclone: (clonedDoc: Document) => {
                    const clonedElement = clonedDoc.getElementById("guide-content");
                    if (clonedElement) {
                        const fracLines = clonedElement.querySelectorAll(".frac-line");
                        fracLines.forEach((el) => {
                            const line = el as HTMLElement;
                            line.style.borderBottomWidth = "1px";
                            line.style.borderBottomStyle = "solid";
                            line.style.display = "block";
                        });
                    }
                }
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const fileName = `Ultimate_Homework_Guide.pdf`;

            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = pdf.output("datauristring").split(',')[1];
                const result = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
                await Share.share({ title: 'Ultimate Homework Guide', url: result.uri });
            } else {
                pdf.save(fileName);
            }
        } catch (err) {
            console.error("PDF Export failed", err);
            alert("Failed to export PDF.");
        }
    };

    const cleanFormula = (f: string) => {
        let cleaned = f.trim();
        if (cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) cleaned = cleaned.slice(2, -2);
        else if (cleaned.startsWith('\\[') && cleaned.endsWith('\\]')) cleaned = cleaned.slice(2, -2);
        else if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) cleaned = cleaned.slice(2, -2);
        else if (cleaned.startsWith('$') && cleaned.endsWith('$')) cleaned = cleaned.slice(1, -1);
        return cleaned.trim();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Ultimate Study Guide</h2>
                        </div>
                        <Button variant="ghost" className="text-white hover:bg-white/20 p-2 rounded-full h-auto w-auto" onClick={onClose}>
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 relative" id="guide-content">
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64 space-y-6">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                                <div className="text-center">
                                    <p className="text-purple-600 font-bold text-xl animate-pulse">Forging Your Ultimate Guide...</p>
                                    <p className="text-slate-500 text-sm mt-2">Analyzing {solutions.length} problems to generate 10 custom practice questions.</p>
                                </div>
                            </div>
                        )}

                        {error && !loading && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-center border border-red-200">
                                {error}
                            </div>
                        )}

                        {guide && !loading && (
                            <div className="space-y-10" ref={guideRef}>
                                <div className="text-center pb-6 border-b-4 border-indigo-100">
                                    <h1 className="text-4xl font-black text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">{guide.topic}</h1>
                                    <p className="text-slate-600 font-medium mt-4 text-lg max-w-2xl mx-auto">{guide.summary}</p>
                                </div>

                                {/* Formulas */}
                                {guide.keyFormulas && guide.keyFormulas.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <Key className="w-6 h-6" />
                                            <h3 className="text-xl font-bold uppercase tracking-wider">Master Formulas</h3>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {guide.keyFormulas.map((f, i) => (
                                                <div key={i} className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                                                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{f.name}</span>
                                                    <div className="text-xl text-slate-800"><KatexRenderer equation={cleanFormula(f.formula)} block /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pro Tips */}
                                {guide.proTips && guide.proTips.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Lightbulb className="w-6 h-6" />
                                            <h3 className="text-xl font-bold uppercase tracking-wider">Pro Tips</h3>
                                        </div>
                                        <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 space-y-4 text-lg">
                                            {guide.proTips.map((tip, i) => (
                                                <div key={i} className="flex gap-4">
                                                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                                                    <div className="font-medium text-slate-700 leading-relaxed"><InlineMathText text={tip} /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Practice Problems */}
                                {guide.practiceProblems && guide.practiceProblems.length > 0 && (
                                    <div className="space-y-6 pt-4">
                                        <div className="flex items-center gap-3 text-emerald-600 pb-2 border-b-2 border-emerald-100">
                                            <BookOpen className="w-8 h-8" />
                                            <h3 className="text-2xl font-black uppercase tracking-wider">Ultimate Practice Test ({guide.practiceProblems.length} Questions)</h3>
                                        </div>
                                        <div className="space-y-8">
                                            {guide.practiceProblems.map((p, i) => (
                                                <div key={i} className="bg-white p-6 rounded-[2rem] border-2 border-emerald-100 shadow-md space-y-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 font-black px-4 py-1 rounded-bl-2xl">
                                                        #{i + 1}
                                                    </div>
                                                    <div className="font-bold text-slate-800 text-lg border-l-4 border-emerald-400 pl-4 py-2">
                                                        <InlineMathText text={p.problem} />
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                                                        <p className="font-black text-emerald-600 uppercase text-xs tracking-widest mb-2">Detailed Solution</p>
                                                        <div className="text-slate-700 mt-2 font-medium">
                                                            {p.solution.split('\\n').map((line, j) => (
                                                                <div key={j} className="mb-2">
                                                                   <InlineMathText text={line} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-white p-5 border-t border-slate-100 flex justify-end gap-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
                        <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 h-12 px-6 rounded-xl">Close</Button>
                        <Button onClick={handleDownloadPDF} disabled={!guide || loading} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                            <Download className="w-5 h-5 mr-2" /> Download Ultimate PDF Tracker
                        </Button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
