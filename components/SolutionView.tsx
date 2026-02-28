"use client";

import { MathSolution } from "@/services/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Download, RefreshCw, Play } from "lucide-react";
import KatexRenderer from "@/components/KatexRenderer";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState } from "react";
import Visualizer from "./Visualizer";
import SocraticChat from "./SocraticChat";
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface SolutionViewProps {
    solution: MathSolution;
    onBack: () => void;
    onGeneratePractice: () => void;
}

export default function SolutionView({ solution, onBack, onGeneratePractice }: SolutionViewProps) {
    const [showVisualizer, setShowVisualizer] = useState(false);
    const [revealedSteps, setRevealedSteps] = useState(1);

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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVisualizer(true)}
                        className="hidden md:flex items-center text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100"
                    >
                        <Play className="mr-2 w-3 h-3 fill-current" />
                        Watch Animation
                    </Button>
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
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

                    <div className="space-y-6">
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
                                    <p className="text-gray-600 leading-relaxed">{step.explanation.replace(/\$/g, "")}</p>
                                    {step.math && (
                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-100 overflow-x-auto">
                                            <KatexRenderer equation={step.math} />
                                        </div>
                                    )}
                                    {step.tip && (
                                        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-100 flex gap-2">
                                            <span className="font-bold">💡 Tip:</span> {step.tip?.replace(/\$/g, "")}
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

                        {solution.steps.length === revealedSteps && (
                            <div className="text-center py-4 bg-indigo-50 rounded-lg border border-indigo-100 mt-6">
                                <h3 className="text-sm text-indigo-600 font-medium mb-1">Final Answer</h3>
                                <div className="text-2xl font-bold text-gray-900">
                                    <KatexRenderer equation={solution.answerLatex} block />
                                </div>
                            </div>
                        )}
                    </div>
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
