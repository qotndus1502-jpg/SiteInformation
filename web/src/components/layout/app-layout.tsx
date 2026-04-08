"use client";

import { Header } from "./header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 sm:px-6 pt-0 pb-4">
        {children}
      </main>
    </div>
  );
}
