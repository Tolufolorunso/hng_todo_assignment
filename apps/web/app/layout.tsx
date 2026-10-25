import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/app/ServiceWorkerRegistrar";
import AppFooter from "@/components/app/AppFooter";
import JsonLd from "@/components/app/JsonLd";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://taskflow-assignment.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "TaskFlow - Modern Offline Productivity Suite",
    template: "%s | TaskFlow",
  },
  description:
    "A fast, single-user, offline-capable productivity suite featuring task management with drag-and-drop reordering, interactive calendar scheduling, Microsoft Word-style rich text notes, and productivity analytics.",
  keywords: [
    "productivity",
    "task manager",
    "to-do app",
    "rich text notes",
    "WYSIWYG editor",
    "calendar schedule",
    "productivity analytics",
    "offline-first",
    "PWA",
    "IndexedDB",
    "Next.js 16",
    "HNG",
  ],
  authors: [
    {
      name: "Tolulope Folorunso",
      url: "https://linkedin.com/in/tolulopebuilds/",
    },
  ],
  creator: "Tolulope Folorunso",
  publisher: "TaskFlow",
  applicationName: "TaskFlow",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "TaskFlow",
    title: "TaskFlow - Modern Offline Productivity Suite",
    description:
      "A fast, single-user, offline-capable productivity suite featuring task management with drag-and-drop reordering, interactive calendar scheduling, Microsoft Word-style rich text notes, and productivity analytics.",
    images: [
      {
        url: "/apple-icon.png",
        width: 512,
        height: 512,
        alt: "TaskFlow Vector Logo and Branding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskFlow - Modern Offline Productivity Suite",
    description:
      "A fast, single-user, offline-capable productivity suite featuring task management with drag-and-drop reordering, interactive calendar scheduling, Microsoft Word-style rich text notes, and productivity analytics.",
    creator: "@tolulopebuilds",
    images: ["/apple-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

const themeInitializerScript = `(function(){try{var s=localStorage.getItem('taskflow_theme');var t=s==='light'?'light':'dark';var d=document.documentElement;d.classList.remove('dark','light');d.classList.add(t);d.setAttribute('data-theme',t);d.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializerScript }}
        />
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text transition-colors duration-150">
        <ServiceWorkerRegistrar />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}

