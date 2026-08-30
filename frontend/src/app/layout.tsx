import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavBar from "@/components/NavBar";
import GuardPrimerIngreso from "@/components/GuardPrimerIngreso";
import "./globals.css";

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
        <NavBar />
        <GuardPrimerIngreso />
        {children}
      </body>
    </html>
  );
}