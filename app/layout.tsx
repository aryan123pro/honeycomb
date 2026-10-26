import type { Metadata, Viewport } from "next";
import { Anton, Archivo, JetBrains_Mono } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const display = Anton({ subsets: ["latin"], variable: "--font-display", weight: "400" });
const body = Archivo({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Comb & Web", template: "%s · Comb & Web" },
  description: "Interactive 3D models of honeycomb and spider-web structures: how bees and spiders build light, tough, damage-tolerant structures, and how engineers copy them.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f100b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body data-cell="lobby" suppressHydrationWarning>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
