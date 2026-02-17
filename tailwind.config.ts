import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#4F46E5", // Indigo 600
                    foreground: "#FFFFFF",
                },
                secondary: {
                    DEFAULT: "#10B981", // Emerald 500
                    foreground: "#FFFFFF",
                },
                destructive: {
                    DEFAULT: "#EF4444", // Red 500
                    foreground: "#FFFFFF",
                },
                muted: {
                    DEFAULT: "#F3F4F6", // Gray 100
                    foreground: "#6B7280", // Gray 500
                },
                accent: {
                    DEFAULT: "#8B5CF6", // Violet 500
                    foreground: "#FFFFFF",
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
