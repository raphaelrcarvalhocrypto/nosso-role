import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "Nosso Rolê ❤️",
  description: "Espaço privado para casais gerenciarem dates, viagens e memórias.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased min-h-screen font-sans bg-[#0f1115] text-slate-100 selection:bg-rose-500/30">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
