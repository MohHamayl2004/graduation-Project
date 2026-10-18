/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#152A63",
          hover: "#0F1F4A",
          tint: "#E8EBF5"
        },
        accent: {
          DEFAULT: "#1E7A3C",
          hover: "#175E2F",
          tint: "#E4F3E9"
        },
        surface: {
          DEFAULT: "#FAFAF9",
          raised: "#FFFFFF",
          alt: "#F1F2F6"
        },
        ink: {
          DEFAULT: "#1B2136",
          muted: "#5B6478",
          faint: "#6B7280"
        },
        border: {
          DEFAULT: "#E2E5EE",
          strong: "#CBD0DE"
        },
        success: {
          DEFAULT: "#1E7A3C",
          tint: "#E4F3E9"
        },
        warning: {
          DEFAULT: "#B45309",
          tint: "#FBEBDA"
        },
        error: {
          DEFAULT: "#B91C1C",
          tint: "#FBE7E7"
        }
      },
      fontFamily: {
        display: ["Tajawal", "system-ui", "sans-serif"],
        sans: ["Tajawal", "system-ui", "sans-serif"],
        arabic: ["'Tajawal'", "system-ui", "sans-serif"]
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.25rem", { lineHeight: "1.5" }],
        "2xl": ["1.5rem", { lineHeight: "1.35" }],
        "3xl": ["1.875rem", { lineHeight: "1.3" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
        "5xl": ["3rem", { lineHeight: "1.12" }],
        "6xl": ["3.75rem", { lineHeight: "1.08" }]
      },
      borderRadius: {
        md: "10px",
        lg: "16px",
        xl: "24px"
      },
      boxShadow: {
        sm: "0 2px 8px rgba(21, 42, 99, 0.06)",
        md: "0 8px 24px rgba(21, 42, 99, 0.10)",
        lg: "0 20px 48px rgba(21, 42, 99, 0.16)"
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms"
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        // Slide transitions. In an Arabic layout the lesson advances
        // leftward, the way pages turn in an Arabic book — so moving
        // forward brings the next slide in from the left.
        "slide-next": {
          from: { opacity: "0", transform: "translateX(-40px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        "slide-prev": {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        // Lines build in one after another, the way a presenter
        // reveals a slide — so the student's eye lands where the
        // narration is, instead of on a wall of finished text.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-next": "slide-next 320ms cubic-bezier(.22,.8,.3,1)",
        "slide-prev": "slide-prev 320ms cubic-bezier(.22,.8,.3,1)",
        "rise-in": "rise-in 380ms cubic-bezier(.22,.8,.3,1) both",
        "modal-in": "modal-in 200ms ease-out"
      }
    }
  },
  plugins: []
};
