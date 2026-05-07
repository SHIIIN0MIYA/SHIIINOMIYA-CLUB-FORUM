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
        dark: "var(--bg)",
        accent: "var(--accent)",
        "accent-glow": "var(--accent-glow)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        "text-primary": "var(--text)",
        "text-secondary": "var(--text-secondary)",
        "nav-bg": "var(--nav-bg)",
        "card-border": "var(--card-border)",
      },
    },
  },
  plugins: [],
};
export default config;