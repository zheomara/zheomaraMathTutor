"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import InlineMathText from "@/components/InlineMathText";

interface SocraticChatProps {
    problemText: string;
    stepContext: string;
}

const uiTranslations: Record<string, any> = {
    English: {
        ask_question: "Ask a question about this step",
        tutor_chat: "Tutor Chat",
        close: "Close",
        what_is_confusing: "What is confusing about this step?",
        thinking: "Thinking...",
        ask_placeholder: "Ask 'Why did we...'"
    }
};

export default function SocraticChat({ problemText, stepContext }: SocraticChatProps) {
    const t = uiTranslations.English;
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
                    chatHistory: messages,
                    language: "English"
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
            } else {
                // Fallback to Puter.js
                const puter = (window as any).puter;
                if (puter) {
                    const puterPrompt = `You are a Grade 2 math tutor. 
                            Context: ${problemText}
                            Step: ${stepContext}
                            Student Question: ${userMsg}
                            Language: English
                            Rule: No dollar signs in explanation. Use simple text.
                            SPACING RULE: You MUST use proper spacing between ALL words. NEVER run words together (e.g., "Gadzirisa izvi" NOT "Gadzirisaizvi").`;

                    const puterResponse = (await Promise.race([
                        puter.ai.chat(puterPrompt),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))
                    ])) as any;

                    const content = typeof puterResponse === 'string' ? puterResponse : puterResponse.message.content;
                    setMessages(prev => [...prev, { role: "assistant", content }]);
                } else {
                    throw new Error("Backend failed and Puter not available");
                }
            }
        } catch (err) {
            console.error("Chat error, trying basic Puter fallback:", err);
            const puter = (window as any).puter;
            if (puter) {
                try {
                    const puterResponse = (await Promise.race([
                        puter.ai.chat(`You are a Grade 2 math tutor. 
                                Student is asking about: ${userMsg}. 
                                Language: English. 
                                Keep it simple for a child.`),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000))
                    ])) as any;
                    const content = typeof puterResponse === 'string' ? puterResponse : puterResponse.message.content;
                    setMessages(prev => [...prev, { role: "assistant", content }]);
                    return;
                } catch (fallbackErr) {
                    console.error("Puter fallback also failed:", fallbackErr);
                }
            }
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
                {t.ask_question}
            </Button>
        );
    }

    return (
        <div className="mt-4 border border-indigo-100 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 flex justify-between items-center border-b border-indigo-100">
                <span>{t.tutor_chat}</span>
                <button onClick={() => setIsOpen(false)} className="text-indigo-400 hover:text-indigo-600">{t.close}</button>
            </div>

            <div className="p-3 max-h-60 overflow-y-auto space-y-3 bg-gray-50/50">
                {messages.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">{t.what_is_confusing}</p>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg p-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
                                <div className="leading-relaxed"><InlineMathText text={m.content} /></div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border rounded-lg p-3 rounded-tl-none flex items-center gap-2 text-gray-500 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> {t.thinking}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2 border-t bg-white flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t.ask_placeholder}
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
