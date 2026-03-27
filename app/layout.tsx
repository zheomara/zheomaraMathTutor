import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Math Tutor",
    description: "AI-powered Math Tutor with exam-style reasoning.",
    manifest: "/manifest.json",
    applicationName: "Math Tutor",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Math Tutor",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        apple: "/icon-192x192.png",
    },
};

export const viewport = {
    themeColor: "#4F46E5",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans`}>
                {children}
                <ServiceWorkerRegister />

            </body>
        </html>
    );
}
