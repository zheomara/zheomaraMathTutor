"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import KatexRenderer from "@/components/KatexRenderer";

interface SocraticChatProps {
    problemText: string;
    stepContext: string;
}

export default function SocraticChat({ problemText, stepContext }: SocraticChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/chat-math`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problemText,
                    stepContent: stepContext,
                    question: userMsg,
                    chatHistory: messages
                }),
            });

            if (!res.ok) throw new Error("Failed to get response");
            const data = await res.json();

            setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting right now." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="mt-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-medium text-xs flex items-center gap-1.5"
            >
                <MessageCircle className="w-3.5 h-3.5" />
                Ask a question about this step
            </Button>
        );
    }

    return (
        <div className="mt-4 border border-indigo-100 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 flex justify-between items-center border-b border-indigo-100">
                <span>Tutor Chat</span>
                <button onClick={() => setIsOpen(false)} className="text-indigo-400 hover:text-indigo-600">Close</button>
            </div>

            <div className="p-3 max-h-60 overflow-y-auto space-y-3 bg-gray-50/50">
                {messages.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">What is confusing about this step?</p>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg p-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
                                <div className="leading-relaxed"><KatexRenderer equation={m.content} /></div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border rounded-lg p-3 rounded-tl-none flex items-center gap-2 text-gray-500 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Thinking...
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2 border-t bg-white flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask 'Why did we...'"
                    className="h-8 text-sm placeholder:text-gray-400"
                    disabled={isLoading}
                />
                <Button size="sm" onClick={handleSend} disabled={!input.trim() || isLoading} className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700">
                    <Send className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}
