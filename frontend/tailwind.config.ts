import type { Config } from "tailwindcss";

// D6 RESUELTO: Colores institucionales oficiales.
//   Principal: #09488D
//   Contraste: #FFFFFF
//   Acento:    #F7C800 (uso secundario)

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        iu: {
          primary:   "#09488D",       // Azul institucional oficial
          secondary: "#0960B0",       // Derivado más claro para hover
          accent:    "#F7C800",       // Amarillo/dorado institucional
          light:     "#F0F4FA",       // Fondo claro (derivado de primary)
          dark:      "#06244A",       // Texto oscuro
          success:   "#2D936C",       // Verde (disponible)
          warning:   "#E6A100",       // Naranja (mora) — derivado del accent
          danger:    "#C73E1D",       // Rojo (dañado)
          gray:      "#6B7280",       // Neutro
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
