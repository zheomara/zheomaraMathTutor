"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Download, BookOpen, Key, Lightbulb, Bookmark } from 'lucide-react';
import { MathSolution } from '@/services/types';
import { generateStudyGuide } from '@/services/math';
import KatexRenderer from './KatexRenderer';
import InlineMathText from './InlineMathText';
import { Button } from './ui/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface StudyGuideProps {
    solution: MathSolution;
    onClose: () => void;
}

interface GuideData {
    topic: string;
    summary: string;
    keyFormulas: { name: string; formula: string }[];
    proTips: string[];
    exampleProblem: { problem: string; solution: string };
}

export default function StudyGuideDialog({ solution, onClose }: StudyGuideProps) {
    const [guide, setGuide] = useState<GuideData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const guideRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                const data = await generateStudyGuide(solution);
                setGuide(data);
            } catch (err: any) {
                setError(err.message || 'Failed to generate guide');
            } finally {
                setLoading(false);
            }
        };
        fetchGuide();
    }, [solution]);

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

            const fileName = `Magic_Study_Guide_${guide?.topic.replace(/\s+/g, '_')}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = pdf.output("datauristring").split(',')[1];
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: Directory.Cache,
                });
                await Share.share({ title: 'Magic Study Guide', url: result.uri });
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
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">Magic Study Guide</h2>
                        </div>
                        <Button variant="ghost" className="text-white hover:bg-white/20 p-2 rounded-full h-auto w-auto" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 relative" id="guide-content">
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                                <p className="text-indigo-600 font-bold animate-pulse">Generating your magic guide...</p>
                            </div>
                        )}

                        {error && !loading && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-center border border-red-200">
                                {error}
                            </div>
                        )}

                        {guide && !loading && (
                            <div className="space-y-8" ref={guideRef}>
                                {/* Document Title Header for PDF */}
                                <div className="text-center pb-4 border-b-2 border-indigo-100">
                                    <h1 className="text-3xl font-black text-slate-800">{guide.topic}</h1>
                                    <p className="text-slate-500 font-medium mt-2">{guide.summary}</p>
                                </div>

                                {/* Formulas */}
                                {guide.keyFormulas && guide.keyFormulas.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <Key className="w-5 h-5" />
                                            <h3 className="text-lg font-bold uppercase tracking-wider">Key Formulas</h3>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {guide.keyFormulas.map((f, i) => (
                                                <div key={i} className="bg-white p-4 rounded-2xl border-2 border-indigo-50 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-10" />
                                                    <span className="text-xs font-bold text-indigo-400 uppercase">{f.name}</span>
                                                    <div className="text-lg text-slate-800"><KatexRenderer equation={cleanFormula(f.formula)} /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pro Tips */}
                                {guide.proTips && guide.proTips.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Lightbulb className="w-5 h-5" />
                                            <h3 className="text-lg font-bold uppercase tracking-wider">Pro Tips</h3>
                                        </div>
                                        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-3">
                                            {guide.proTips.map((tip, i) => (
                                                <div key={i} className="flex gap-3">
                                                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                    <div className="text-sm font-medium text-slate-700 leading-relaxed"><InlineMathText text={tip} /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Example */}
                                {guide.exampleProblem && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <BookOpen className="w-5 h-5" />
                                            <h3 className="text-lg font-bold uppercase tracking-wider">Practice Example</h3>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-50 shadow-sm space-y-4">
                                            <div className="font-bold text-slate-800 border-l-4 border-emerald-400 pl-3">
                                                <InlineMathText text={guide.exampleProblem.problem} />
                                            </div>
                                            <div className="text-sm text-slate-600 leading-relaxed space-y-2">
                                                <p className="font-bold text-emerald-600 uppercase text-xs tracking-widest">Solution</p>
                                                <div className="prose prose-sm max-w-none text-slate-700">
                                                    {guide.exampleProblem.solution.split('\n').map((line, i) => (
                                                        <div key={i} className="min-h-[1.5rem] mb-2">
                                                           <InlineMathText text={line} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-white p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                        <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">Close</Button>
                        <Button onClick={handleDownloadPDF} disabled={!guide || loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all">
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
