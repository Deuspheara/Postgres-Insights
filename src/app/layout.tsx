import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatusBar } from "@/components/layout/status-bar";
import { Providers } from "@/components/providers";
import { ActiveConnectionProvider, ConnectionTransition } from "@/components/active-connection-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PG Insights — Database Copilot",
  description: "AI-powered PostgreSQL analytics workbench",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <ActiveConnectionProvider>
            <div className="flex h-screen overflow-hidden bg-background">
              {/* Narrow icon-only sidebar */}
              <Sidebar />

              {/* Right column: topbar + content + status bar */}
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Topbar />
                <ConnectionTransition>
                  {children}
                </ConnectionTransition>
                <StatusBar />
              </div>
            </div>
            <Toaster />
          </ActiveConnectionProvider>
        </Providers>
      </body>
    </html>
  );
}
