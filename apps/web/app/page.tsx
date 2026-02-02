import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Rocket, GitCommit, FileText, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full border-b border-b-foreground/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4 px-6">
          <Link href="/" className="font-mono font-semibold text-xl flex items-center gap-2">
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

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-20">
          {/* Hero Section */}
          <div className="text-center space-y-8 pt-8">
            <div className="flex justify-center">
              <div className="relative inline-flex items-center justify-center p-6 bg-primary rounded-2xl shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary rounded-2xl blur-sm"></div>
                <Rocket className="h-16 w-16 text-primary-foreground relative z-10" strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="font-mono text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                Make your work
                <br />
                <span className="text-muted-foreground">stand out</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Get noticed. Get promoted. Wow your customers.
                Turn your commits into updates that showcase real impact.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link href="/auth/sign-up">
                <Button size="lg" className="text-lg px-10 h-14 gap-2">
                  Start getting noticed
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              Free forever. No credit card.
            </p>
          </div>

          {/* How It Works */}
          <div className="space-y-8">
            <h2 className="font-mono text-3xl md:text-4xl font-bold text-center">
              Three steps to recognition
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl border border-foreground/10 bg-card">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <GitCommit className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono font-semibold text-xl">Connect repos</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your commits are proof of work. Let them speak for you.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl border border-foreground/10 bg-card">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono font-semibold text-xl">Add context</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Quick notes turn commits into stories. No formatting required.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl border border-foreground/10 bg-card">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono font-semibold text-xl">Share everywhere</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Generate updates for your boss, clients, or LinkedIn. Same work, bigger impact.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="space-y-8">
            <h2 className="font-mono text-3xl md:text-4xl font-bold text-center">
              Get credit for your work
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Impress your manager</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Stop underselling your work in standups. Show real progress with concrete evidence.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Win more clients</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Turn technical work into value they understand. Clients pay for clarity.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Nail performance reviews</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Promotions go to people who can prove impact. Your commits are the receipts.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Build your reputation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Share your wins on LinkedIn. Stand out from developers who stay silent.
                </p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center space-y-6 py-12">
            <h2 className="font-mono text-3xl md:text-4xl font-bold">
              Your work deserves an audience
            </h2>
            <p className="text-xl text-muted-foreground">
              Start getting the recognition you've earned.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-10 h-14 gap-2">
                Start for free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="w-full border-t py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p className="font-mono">&copy; 2026 Shipshow • Your work, amplified</p>
        </div>
      </footer>
    </main>
  );
}
