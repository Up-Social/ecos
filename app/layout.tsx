import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECOS — Panel de administración",
  description: "Sistema de gestión ECOS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
