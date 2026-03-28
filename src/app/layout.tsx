import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "CertForge — Free SSL Certificate Generator",
  description:
    "Generate free SSL/TLS certificates for your domains using Let's Encrypt. Supports HTTP-01 and DNS-01 challenges, wildcard certificates, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Navbar />
          <main className="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
