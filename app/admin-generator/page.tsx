"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Key, RotateCcw } from "lucide-react";
import { generateDeviceCode, USED_MONTHS_KEY } from "@/lib/otp";
import { useRouter } from "next/navigation";
import { Preferences } from '@capacitor/preferences';

export default function AdminGenerator() {
    const router = useRouter();
    const [deviceId, setDeviceId] = useState("");
    const [monthKey, setMonthKey] = useState("");
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Default to the current month
    useEffect(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        setMonthKey(`${year}-${month}`);
    }, []);

    const handleResetState = async () => {
        if (window.confirm("Remove license AND reset free tries on this device? (Use for testing)")) {
            localStorage.removeItem("licenseExpiry");
            await Preferences.remove({ key: 'free_tries_count' });
            await Preferences.remove({ key: 'licenseExpiry' }); // Just in case it's in Preferences too
            await Preferences.remove({ key: USED_MONTHS_KEY }); // Clear used codes for testing
            alert("App locked and free tries reset to 0! Returning to dashboard.");
            window.location.href = "/"; // Force a full reload to clear all states
        }
    };

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deviceId || !monthKey) return;

        // Ensure it's in YYYY-MM format
        if (!/^\d{4}-\d{2}$/.test(monthKey)) {
            alert("Invalid month format.");
            return;
        }

        const code = generateDeviceCode(deviceId.toUpperCase().trim(), monthKey);
        setGeneratedCode(code);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:bg-gray-100"
                    >
                        Back
                    </Button>
                    <div className="bg-indigo-100 p-2 rounded-xl">
                        <Key className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Code Generator</h1>
                    <p className="text-sm text-gray-500">Generate 31-day access codes for students.</p>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Student's Device ID</label>
                        <Input
                            placeholder="e.g. A7X9B2"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                            className="h-14 font-mono font-bold tracking-widest text-lg bg-gray-50 border-2 border-gray-200"
                            maxLength={6}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Payment Month</label>
                        <Input
                            type="month"
                            value={monthKey}
                            onChange={(e) => setMonthKey(e.target.value)}
                            className="h-14 font-bold text-lg bg-gray-50 border-2 border-gray-200"
                            required
                        />
                        <p className="text-xs text-gray-400 font-medium">Select the calendar month they are paying for.</p>
                    </div>

                    <Button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 font-bold text-lg rounded-xl shadow-lg shadow-indigo-200 mt-2">
                        Generate Code
                    </Button>
                </form>

                {generatedCode && (
                    <div className="mt-8 p-6 bg-green-50 rounded-2xl border-2 border-green-200 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-sm font-bold text-green-700 uppercase tracking-widest">Share this code:</p>
                        <div className="text-5xl font-mono font-black text-green-800 tracking-widest py-2">
                            {generatedCode}
                        </div>
                        <p className="text-xs font-medium text-green-600">This code will grant exactly 31 days to Device {deviceId.toUpperCase()}.</p>
                    </div>
                )}

                <div className="pt-8 border-t border-gray-100 flex justify-center">
                    <Button
                        variant="ghost"
                        onClick={handleResetState}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset App Lock (Debug)
                    </Button>
                </div>
            </div>
        </div>
    );
}
