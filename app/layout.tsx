import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { I18nProvider } from "@/components/i18n-provider"
import { getAvailableLanguages, getDictionary, DEFAULT_LANGUAGE } from "@/lib/i18n"
import { getSettings } from "@/lib/data"
import { SESSION_COOKIE_NAME, type SessionUser } from "@/lib/types"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weight Tracker",
  description: "A self-hosted mobile-first weight tracking application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Weight Tracker",
  },
  icons: {
    icon: [
      { url: "/pwa-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

// Viewport configuration to prevent layout shifts when keyboard appears
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-visual', // Keeps layout stable when keyboard appears
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the UI language from the logged-in user's settings (default otherwise)
  const languages = await getAvailableLanguages();
  let language = DEFAULT_LANGUAGE;
  try {
    const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);
    if (sessionCookie?.value) {
      const session = JSON.parse(sessionCookie.value) as SessionUser;
      if (session?.username) {
        const settings = await getSettings(session.username);
        if (settings.language && languages.includes(settings.language)) {
          language = settings.language;
        }
      }
    }
  } catch {
    // Not logged in or unreadable session: fall back to the default language
  }
  const dictionary = await getDictionary(language);

  return (
    <html lang={language} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <I18nProvider dictionary={dictionary} locale={language} languages={languages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-left" closeButton />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
