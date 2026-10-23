import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import AmbientGlyphs from "@/components/AmbientGlyphs";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inicio | EKLOCKE",
  description: "El espacio de jugadores, equipos y torneo de Pokémon Consonancia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AmbientGlyphs />
        <Suspense
          fallback={
            <header
              aria-hidden="true"
              className="h-[61px] border-b border-violet-300/15 bg-[#090d1b]/85"
            />
          }
        >
          <SiteHeader />
        </Suspense>
        <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
