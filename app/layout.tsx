import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "FIU Citation Tracker",
  // description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} antialiased overflow-hidden fixed w-screen h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
