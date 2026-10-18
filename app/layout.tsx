import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SessionHydrator } from "@/components/SessionHydrator";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Satori: SAT prep that shows you why",
  description: "Take an SAT Math practice module, then watch the replay: why each mistake happened, how many points it cost, and how to fix it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh">
        <SessionHydrator />
        {children}
      </body>
    </html>
  );
}
