"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lock, Phone, CreditCard, ChevronLeft } from "lucide-react";
import { getInternetNow } from "@/lib/time";
import { getDeviceId } from "@/lib/deviceId";
import { verifyDeviceCode, markMonthAsUsed } from "@/lib/otp";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AccessGateProps {
    isOpen: boolean;
    onSuccess: () => void;
}

const uiTranslations: Record<string, any> = {
    English: {
        locked: "Access Locked",
        unlockSub: "To unlock, send the tutor your Device ID to receive a 31-day access code.",
        yourDeviceId: "Your Device ID",
        placeholder: "Enter Access Code",
        verifying: "Verifying...",
        unlockBtn: "Unlock Tutor",
        howToPay: "How to Pay ($4)",
        sendEcocash: "Send EcoCash",
        sendAmount: "Send $4.00 USD to the following number:",
        step1: "Send EcoCash payment.",
        step2: "Send the tutor your",
        step3: "Enter your Unlocking Code.",
        backToCode: "Back to Code",
        invalidCode: "Invalid access code",
        connError: "Failed to verify time. Please check your internet connection."
    }
};

export default function AccessGate({ isOpen, onSuccess }: AccessGateProps) {
    const t = uiTranslations.English;
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [mode, setMode] = useState<"code" | "pay">("code");

    // Provide a simple effect to clear password/error when reopened
    // Also fetch the device ID.
    useEffect(() => {
        if (isOpen) {
            setPassword("");
            setError("");
            setMode("code");
            getDeviceId().then(setDeviceId);
        }
    }, [isOpen]);

    const handleLongPress = () => {
        const adminPass = window.prompt("Enter Admin Password:");
        if (adminPass === "Matipa@2021") {
            router.push('/admin-generator');
        } else if (adminPass) {
            alert("Incorrect password.");
        }
    };

    const handlePressStart = () => {
        const timer = setTimeout(handleLongPress, 2000); // 2 seconds
        setPressTimer(timer);
    };

    const handlePressEnd = () => {
        if (pressTimer) clearTimeout(pressTimer);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (!deviceId) return;

            // Backdoor for testing or emergencies
            if (password === "Matipa@2021") {
                const now = await getInternetNow();
                const expiry = new Date(now);
                expiry.setUTCDate(expiry.getUTCDate() + 31);
                localStorage.setItem("licenseExpiry", expiry.toISOString());
                onSuccess();
                return;
            }

            const matchedMonth = await verifyDeviceCode(deviceId, password);

            if (matchedMonth !== null) {
                // Success! Give them 31 days and record this month so it can't be reused.
                const now = await getInternetNow();
                const expiry = new Date(now);
                expiry.setUTCDate(expiry.getUTCDate() + 31);

                localStorage.setItem("licenseExpiry", expiry.toISOString());
                await markMonthAsUsed(matchedMonth);
                onSuccess();
            } else {
                setError(t.invalidCode);
            }
        } catch (err) {
            setError(t.connError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 space-y-6">
                            <div className="text-center space-y-3">
                                <div
                                    className="mx-auto bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-indigo-100 shadow-inner cursor-pointer"
                                    onMouseDown={handlePressStart}
                                    onMouseUp={handlePressEnd}
                                    onMouseLeave={handlePressEnd}
                                    onTouchStart={handlePressStart}
                                    onTouchEnd={handlePressEnd}
                                >
                                    <Lock className="w-8 h-8 text-indigo-600 pointer-events-none" />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t.locked}</h1>
                                <p className="text-sm text-gray-500 font-medium">{t.unlockSub}</p>

                                {deviceId && (
                                    <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mt-4 mb-2">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">{t.yourDeviceId}</p>
                                        <p className="text-3xl font-mono font-bold text-gray-900 tracking-[0.2em]">{deviceId}</p>
                                    </div>
                                )}
                            </div>

                            {mode === "code" ? (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            type="password"
                                            placeholder={t.placeholder}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`h-14 bg-gray-50 border-2 px-4 rounded-xl text-lg transition-all ${error ? "border-red-400 focus-visible:ring-red-500" : "border-gray-200 focus:border-indigo-500 focus:bg-white"}`}
                                        />
                                        {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-14 rounded-xl text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                        disabled={loading || !password}
                                    >
                                        {loading ? t.verifying : t.unlockBtn}
                                    </Button>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setMode("pay")}
                                            className="w-full py-3 text-indigo-600 font-bold text-sm bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            {t.howToPay}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-5">
                                    <div className="bg-gray-50 p-5 rounded-2xl border-2 border-dashed border-gray-200 text-center space-y-3">
                                        <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                                            <Phone className="w-6 h-6 text-green-600" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg">{t.sendEcocash}</h3>
                                        <p className="text-sm text-gray-600">{t.sendAmount}</p>
                                        <div className="bg-white py-3 px-4 rounded-xl border border-gray-200 shadow-sm inline-block">
                                            <span className="font-mono text-xl font-bold text-gray-900 tracking-wider">0773197868</span>
                                        </div>
                                        <p className="text-xs flex items-center justify-center gap-2 text-gray-500 pt-2 pb-1">
                                            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex justify-center items-center font-bold">1</span>
                                            {t.step1}
                                        </p>
                                        <p className="text-xs flex items-center justify-center gap-2 text-gray-500 pb-1">
                                            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex justify-center items-center font-bold">2</span>
                                            {t.step2} <strong className="text-gray-900 font-mono tracking-widest">{deviceId}</strong>.
                                        </p>
                                        <p className="text-xs flex items-center justify-center gap-2 text-gray-500">
                                            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex justify-center items-center font-bold">3</span>
                                            {t.step3}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setMode("code")}
                                        className="w-full py-2 text-gray-500 font-semibold text-sm hover:text-gray-700 flex items-center justify-center gap-1"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        {t.backToCode}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
