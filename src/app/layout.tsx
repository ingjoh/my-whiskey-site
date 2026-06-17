import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { GlobalOverlayProvider } from "@/components/GlobalOverlayProvider";
import AttributionTracker from "@/components/AttributionTracker";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | M/Y Whiskey",
    default: "M/Y Whiskey | Luxury Yacht Charters",
  },
  description: "Experience the ultimate luxury yacht charter aboard M/Y Whiskey.",
  openGraph: {
    title: "M/Y Whiskey | Luxury Yacht Charters",
    description: "Experience the ultimate luxury yacht charter aboard M/Y Whiskey.",
    url: "https://mywhiskey.com",
    siteName: "M/Y Whiskey",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <GlobalOverlayProvider>
          <SiteSettingsProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <AttributionTracker />
              </Suspense>
              {children}
            </AuthProvider>
          </SiteSettingsProvider>
        </GlobalOverlayProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
