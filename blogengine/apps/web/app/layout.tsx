import type { Metadata } from "next";
import { Quicksand, DM_Serif_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zuply",
  description: "Plateforme de generation d'articles SEO",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        className={`${quicksand.variable} ${dmSerif.variable} ${geistMono.variable} font-sans bg-white text-text-primary antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
