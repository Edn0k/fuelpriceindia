import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--color-bg) / <alpha-value>)",
                surface: "rgb(var(--color-surface) / <alpha-value>)",
                card: "rgb(var(--color-card) / <alpha-value>)",
                primary: "rgb(var(--color-primary) / <alpha-value>)",
                success: "rgb(var(--color-success) / <alpha-value>)",
                text: "rgb(var(--color-text) / <alpha-value>)",
                muted: "rgb(var(--color-muted) / <alpha-value>)",
                border: "rgb(var(--color-border) / <alpha-value>)",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};

export default config;
