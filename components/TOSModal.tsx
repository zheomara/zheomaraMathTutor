"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ScrollText, CheckCircle } from "lucide-react";

interface TOSModalProps {
    onAccept: () => void;
}

const uiTranslations: Record<string, any> = {
    English: {
        title: "Academic Integrity",
        desc1: "This tool is designed to help you ",
        learn: "learn",
        desc2: ", not to cheat.",
        agreeTo: "By continuing, you agree to:",
        promise1: "Attempt the problem yourself first.",
        promise2: "Read the step-by-step explanations.",
        promise3: "Use this calculator responsibly.",
        btn: "I Agree & Promise Integrity"
    }
};

export default function TOSModal({ onAccept }: TOSModalProps) {
    const t = uiTranslations.English;
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
                    <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
                    <div className="text-gray-600 text-sm leading-relaxed">
                        {t.desc1} <strong>{t.learn}</strong>{t.desc2}
                        <br /><br />
                        {t.agreeTo}
                        <ul className="text-left list-disc list-inside mt-2 space-y-1">
                            <li>{t.promise1}</li>
                            <li>{t.promise2}</li>
                            <li>{t.promise3}</li>
                        </ul>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <Button onClick={handleAccept} className="w-full" size="lg">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {t.btn}
                    </Button>
                </div>
            </div>
        </div>
    );
}
