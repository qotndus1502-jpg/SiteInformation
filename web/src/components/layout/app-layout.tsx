"use client";

import { Header } from "./header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 sm:px-6 py-3 pb-4">
        {children}
      </main>
    </div>
  );
}
