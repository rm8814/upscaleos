import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PropertyProvider } from "@/components/providers/PropertyProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: "Upscale OS | Hotel Management System",
  description: "High-end operational hub for luxury hotels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full font-body bg-ink text-ice"
        suppressHydrationWarning
      >
        <AuthProvider>
          <PropertyProvider>
            <ConvexClientProvider>
              <ToastProvider>{children}</ToastProvider>
            </ConvexClientProvider>
          </PropertyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

