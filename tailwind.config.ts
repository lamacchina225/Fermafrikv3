import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Couleurs du logo Ferm'Afrik ──────────────────────────
        // Or chaud (intérieur de l'œuf) — accent principal
        brand: {
          DEFAULT: "#d4a843",
          50:  "#fdf8ec",
          100: "#faefd0",
          200: "#f5dda0",
          300: "#eec96b",
          400: "#e6b540",
          500: "#d4a843",   // couleur logo or
          600: "#b8891a",
          700: "#906814",
          800: "#6e4e12",
          900: "#4a3510",
          foreground: "#ffffff",
        },
        // Vert olive foncé (poule + texte du logo)
        olive: {
          DEFAULT: "#3d5426",
          50:  "#f2f5ec",
          100: "#dfe9ce",
          200: "#bfd39d",
          300: "#99b96a",
          400: "#729f40",
          500: "#5a7e30",
          600: "#4a6928",
          700: "#3d5426",   // couleur logo olive
          800: "#2e3f1c",
          900: "#1e2a12",
          foreground: "#ffffff",
        },
        phase: {
          demarrage: "#f5c842",
          croissance: "#8ecae6",
          production: "#95d5b2",
        },
        background: "#f7f8f5",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          50: "#fdf8ec",
          100: "#faefd0",
          200: "#f5dda0",
          300: "#eec96b",
          400: "#e6b540",
          500: "#d4a843",
          600: "#b8891a",
          700: "#906814",
          800: "#6e4e12",
          900: "#4a3510",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
