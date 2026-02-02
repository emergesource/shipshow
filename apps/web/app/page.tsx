import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full border-b border-b-foreground/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4 px-6">
          <Link href="/" className="font-semibold text-xl flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            <span>SHIPSHOW</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 py-20">
          <div className="flex justify-center mb-8">
            <div className="relative inline-flex items-center justify-center p-6 bg-primary rounded-2xl shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary rounded-2xl blur-sm"></div>
              <Rocket className="h-16 w-16 text-primary-foreground relative z-10" strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Turn messy work into clear updates
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Shipshow combines your notes and git activity into audience-appropriate updates you can confidently share.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8">
                Get started for free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Log in
              </Button>
            </Link>
          </div>

          <div className="pt-12 grid md:grid-cols-3 gap-8 text-left">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Frictionless capture</h3>
              <p className="text-muted-foreground">
                Add notes without titles or structure. Your git commits provide the evidence.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Audience first</h3>
              <p className="text-muted-foreground">
                Generate updates tailored for your team, executives, or the public.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Clear, honest stories</h3>
              <p className="text-muted-foreground">
                Get summaries that explain what happened, not just what changed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full border-t py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Shipshow. Explain your work more clearly, faster, and with less stress.</p>
        </div>
      </footer>
    </main>
  );
}
