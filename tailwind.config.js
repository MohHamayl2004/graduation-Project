/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        nipras: {
          bg: "#f2f3f8",
          panel: "#eef0f7",
          card: "#f8f9fd",
          border: "#d3d7e5",
          ink: "#141a2b",
          muted: "#5f6477",
          primary: "#1f65d6",
          accent: "#6f42f3"
        }
      },
      boxShadow: {
        soft: "0 10px 24px rgba(25, 35, 70, 0.08)"
      }
    }
  },
  plugins: []
};
