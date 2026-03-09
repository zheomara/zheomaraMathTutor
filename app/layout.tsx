import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Math Tutor PWA",
    description: "AI-powered Math Tutor",
    manifest: "/manifest.json",
    icons: {
        apple: "/icon-192x192.png",
    },
    themeColor: "#4F46E5",
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
                <script src="/puter.v2.js"></script>

            </body>
        </html>
    );
}
