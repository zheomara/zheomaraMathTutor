"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lock } from "lucide-react";
import { getInternetNow } from "@/lib/time";
import TOSModal from "@/components/TOSModal";
import Dashboard from "@/components/Dashboard";

export default function AccessGate() {
    const [hasAccess, setHasAccess] = useState(false);
    const [tosAccepted, setTosAccepted] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAccess() {
            try {
                const expiryStr = localStorage.getItem("licenseExpiry");
                const tos = localStorage.getItem("tosAccepted");

                if (tos === "true") setTosAccepted(true);

                if (!expiryStr) {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const expiry = new Date(expiryStr);
                const now = await getInternetNow();

                if (now < expiry) {
                    setHasAccess(true);
                } else {
                    // Expired
                    setHasAccess(false);
                    localStorage.removeItem("licenseExpiry"); // Clear expired license
                }
            } catch (err) {
                console.error("Access check failed:", err);
                // On error, we default to locked for security
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        }

        checkAccess();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (password === "Matipa@2021") {
                const now = await getInternetNow();
                const expiry = new Date(now);
                expiry.setUTCDate(expiry.getUTCDate() + 31);

                localStorage.setItem("licenseExpiry", expiry.toISOString());
                setHasAccess(true);
            } else {
                setError("Invalid access code");
            }
        } catch (err) {
            setError("Failed to verify time. Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleTosAccept = () => {
        setTosAccepted(true);
    };

    if (loading) return null; // Or a spinner

    if (!hasAccess) {
        return (
            <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg space-y-6">
                <div className="text-center space-y-2">
                    <div className="mx-auto bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center">
                        <Lock className="w-6 h-6 text-gray-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Tutor Access Gate</h1>
                    <p className="text-sm text-gray-500">Please enter the access code to continue.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Enter Access Code"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                    </div>
                    <Button type="submit" className="w-full">
                        Unlock
                    </Button>
                </form>
            </div>
        );
    }

    if (!tosAccepted) {
        return <TOSModal onAccept={handleTosAccept} />;
    }

    return <Dashboard />;
}
