/**
 * layout.tsx — Layout raíz de la aplicación
 *
 * RNF-04: Diseño responsive (Tailwind mobile-first)
 * RNF-08: Coherencia visual (pendiente validar colores con Dionizio)
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// DECISION PENDIENTE (RNF-08): Validar tipografía con página institucional
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Lab IUCMC — Gestión de Préstamos",
  description:
    "Sistema descentralizado de préstamos del Laboratorio de Física y Sistemas Embebidos de la IUCMC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-iu-light font-sans text-iu-dark antialiased">
        {/* Providers (Auth, Toast, etc.) se agregarán en M1 */}
        {children}
      </body>
    </html>
  );
}
