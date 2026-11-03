import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#090B10",
          900: "#10141E",
          850: "#151B28",
          800: "#1B2232",
          700: "#263045"
        },
        neon: {
          pink: "#F43F5E", // Refined chic rose (soft, less glaring)
          cyan: "#14B8A6"  // Refined mint teal (clean, serene)
        },
        gold: "#F59E0B",   // Warm champagne gold
        ink: {
          mute: "#94A3B8", // Crisp slate tone
          subtle: "#64748B"
        }
      },
      fontFamily: {
        display: ["Kanit", "sans-serif"],
        body: ["Noto Sans Thai", "sans-serif"]
      },
      boxShadow: {
        glowPink: "0 4px 18px -2px rgba(244, 63, 94, 0.25)",
        glowCyan: "0 4px 18px -2px rgba(20, 184, 166, 0.22)",
        soft: "0 10px 25px -5px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        hero: "radial-gradient(900px circle at 15% 10%, rgba(244,63,94,0.08), transparent 50%), radial-gradient(800px circle at 85% 15%, rgba(20,184,166,0.06), transparent 45%), radial-gradient(600px circle at 50% 90%, rgba(245,158,11,0.04), transparent 50%)"
      }
    }
  },
  plugins: []
} satisfies Config;
