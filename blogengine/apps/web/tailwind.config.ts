import type { Config } from "tailwindcss";
// @ts-ignore
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        accent: "#3b5bfe",
        "accent-hover": "#2d4bef",
        "accent-light": "rgba(59, 91, 254, 0.06)",
        "accent-orange": "#f97316",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-quicksand)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "spin-slow": "spin 1.2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [
    addVariablesForColors,
  ],
};

// Plugin that adds each Tailwind color as a CSS variable
function addVariablesForColors({ addBase, theme }: any) {
  const allColors = flattenColorPalette(theme("colors"));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );
  addBase({
    ":root": newVars,
  });
}

export default config;
