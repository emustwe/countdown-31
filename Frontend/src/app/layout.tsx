import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurora Ways",
  description: "Demo, play-money slot platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
