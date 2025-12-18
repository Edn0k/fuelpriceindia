import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Inter } from "next/font/google";
import { Layout } from "../components/layout/Layout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FuelPriceIndia – Daily Petrol & Diesel Prices Across India",
  description:
    "Check daily petrol, diesel, LPG and CNG prices for every Indian state and major cities. Data cached from external APIs in Supabase.",
  icons: {
    icon: "/logo.svg?v=3",
    apple: "/logo.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5922980925549177"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-text">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
