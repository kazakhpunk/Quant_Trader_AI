import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { ThemeProvider } from "@/providers/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: 'Quant Trader AI',
  description: "Quant Trader AI is an advanced trading platform that leverages artificial intelligence to provide real-time trading signals. The platform includes detailed fundamental analysis to offer insights into a company's financial health, technical analysis to predict price movements, volatility analysis to manage risks associated with price changes, and sentiment analysis to gauge market sentiment from news and social media. Our aim is to empower traders to make informed decisions by automating the process of buying low and selling high.",
  icons: {
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: '/gem.ico',
        href: '/gem.ico',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/gem.ico',
        href: '/gem.ico',
      },
    ],
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={GeistSans.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
