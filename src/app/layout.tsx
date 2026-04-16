import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/lib/session-provider";
import { PwaRegister } from "@/components/PwaRegister";
import { AppStartupScreen } from "@/components/AppStartupScreen";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { ICON_VERSION } from "@/lib/icon-url";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#2d6a4f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Ferm'Afrik",
    template: "%s | Ferm'Afrik",
  },
  description: "Application de gestion de ferme avicole – Burkina Faso",
  manifest: `/manifest.json?v=${ICON_VERSION}`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ferm'Afrik",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: `/api/icon?size=32&v=${ICON_VERSION}`, sizes: "32x32", type: "image/png" },
      { url: `/api/icon?size=192&v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: `/apple-icon?v=${ICON_VERSION}`, sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* iOS splash screen support */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ferm'Afrik" />
        <link rel="mask-icon" href={`/api/icon?size=512&v=${ICON_VERSION}`} color="#2d6a4f" />
      </head>
      <body className={inter.className}>
        <AppStartupScreen />
        <ConnectivityBanner />
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
        <PwaRegister />
      </body>
    </html>
  );
}
