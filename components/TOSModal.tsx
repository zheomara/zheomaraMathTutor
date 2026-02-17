"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ScrollText, CheckCircle } from "lucide-react";

interface TOSModalProps {
    onAccept: () => void;
}

export default function TOSModal({ onAccept }: TOSModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem("tosAccepted");
        if (!accepted) {
            setIsOpen(true);
        } else {
            onAccept();
        }
    }, [onAccept]);

    const handleAccept = () => {
        localStorage.setItem("tosAccepted", "true");
        setIsOpen(false);
        onAccept();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center">
                        <ScrollText className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Academic Integrity</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        This tool is designed to help you <strong>learn</strong>, not to cheat.
                        <br /><br />
                        By continuing, you agree to:
                        <ul className="text-left list-disc list-inside mt-2 space-y-1">
                            <li>Attempt the problem yourself first.</li>
                            <li>Read the step-by-step explanations.</li>
                            <li>Use this calculator responsibly.</li>
                        </ul>
                    </p>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <Button onClick={handleAccept} className="w-full" size="lg">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        I Agree & Promise Integrity
                    </Button>
                </div>
            </div>
        </div>
    );
}
