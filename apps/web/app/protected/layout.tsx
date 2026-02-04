import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { MainNav } from "@/components/main-nav";
import { Rocket } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Top Bar - Logo and Auth */}
      <div className="w-full border-b border-b-foreground/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4 px-6">
          <div className="flex items-center gap-4">
            <Link href="/protected" className="font-mono font-semibold text-xl flex items-center gap-2 hover:text-primary transition-colors">
              <Rocket className="h-6 w-6" />
              <span>SHIPSHOW</span>
            </Link>
            <MobileNav />
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <MainNav />

      <div className="flex-1 w-full">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </div>

      <footer className="w-full border-t py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p className="font-mono">&copy; 2026 <a className="underline" href="https://emergesource.com" target="_blank" rel="noopener noreferrer">emergesource</a> • Showcase your work!</p>
        </div>
      </footer>
    </main>
  );
}
