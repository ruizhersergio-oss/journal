import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/shared/Sidebar";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "ICT Trading Journal — Dashboard, Diario, DOL Stats",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#0d0f14] text-[#e8eaf0]">
        <Sidebar />
        <main className="ml-56 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
