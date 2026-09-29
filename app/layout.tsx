import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/app/ServiceWorkerRegistrar";
import AppFooter from "@/components/app/AppFooter";
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
  title: "TaskFlow",
  description:
    "A single-user, offline-capable task and notes app with no sign-up and no server; all data lives in the browser.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
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
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text transition-colors duration-150">
        <ServiceWorkerRegistrar />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
