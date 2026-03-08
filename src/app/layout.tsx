import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: 'Shubham Vij',
  description: 'Always building something new - probably vibing rn.',
  keywords: ['Shubham Vij', 'software engineer', 'research', 'portfolio', 'research engineer', 'developer', 'personal website', "ai", "machine learning", "deep learning", "natural language processing", "computer vision", "reinforcement learning", "ml", "ml engineer", "data scientist", "open source", "projects", "blog", "about me"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
