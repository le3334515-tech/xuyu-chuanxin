import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { LangProvider } from "@/components/lang-provider";

export const metadata: Metadata = {
  title: "续语传心 / SecondVoice — 为你说不出口的那句话",
  openGraph: {
    title: "为你说不出口的那一句话。",
    description: "写下来，念出来，随时打断重说。双语辅助沟通原型。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "续语传心 / SecondVoice",
  },
  description:
    "双语辅助沟通原型：写下要说的话，让它替你说出来，随时停下、修订、重说。A bilingual speaking companion.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
