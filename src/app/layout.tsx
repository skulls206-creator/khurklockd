import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PWARegister from "../components/ui/PWARegister";
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
  title: "Khurklockd — Encrypted Digital Vault",
  description:
    "A local-first, encrypted password manager and digital vault. Argon2id + AES-256-GCM encryption, TOTP generator, breach monitoring, CSV/JSON import, and emergency access.",
  manifest: "/khurklockd/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Khurklockd",
  },
  icons: {
    icon: [
      { url: "/khurklockd/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/khurklockd/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/khurklockd/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#07080D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content="Khurklockd" />
      </head>
      <body className="min-h-full flex flex-col">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
