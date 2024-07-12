import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: 'Website Title',
  description: 'Website description',
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
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
