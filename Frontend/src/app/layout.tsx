import type { Metadata } from "next";
import { Lilita_One, Fredoka, Orbitron, Cinzel_Decorative } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import "./dune.css";

const lilitaOne = Lilita_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lilita",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-orbitron",
  display: "swap",
});

// Ornate serif display face for the "Desert Dune" wordmark — a luxury-casino feel.
const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Count Down 31 — Arcade Cow Counting Game",
  description: "Count Down 31 — A juicy, high-energy arcade cow counting game. Don't be the one to hit 31!",
};

// Runs before paint so the persisted light/dark choice and cached theme family are applied
// with no flash of the wrong palette. The family is reconciled with the server after load.
const themeScript = `(function(){try{var s=localStorage.getItem('aurora-ways-settings');var t=s?JSON.parse(s).state.theme:'dark';document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}try{var f=localStorage.getItem('dd-theme-family');document.documentElement.dataset.themeFamily=f==='desert'?'desert':'monster';}catch(e){document.documentElement.dataset.themeFamily='monster';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-theme-family="monster"
      suppressHydrationWarning
      className={`${lilitaOne.variable} ${fredoka.variable} ${orbitron.variable} ${cinzelDecorative.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-ui">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
