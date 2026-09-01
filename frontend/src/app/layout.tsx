import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NavBar from "@/components/NavBar";
import GuardPrimerIngreso from "@/components/GuardPrimerIngreso";
import PushNotifier from "@/components/PushNotifier";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Lab IUCMC — Gestión de Préstamos",
  description:
    "Sistema descentralizado de préstamos del Laboratorio de Física y Sistemas Embebidos de la IUCMC",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Lab IUCMC",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.jpg",
    apple: "/icons/icon-192.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#09488D",
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
        <PushNotifier />
      </body>
    </html>
  );
}