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
                Stop writing updates
                <br />
                <span className="text-muted-foreground">from scratch</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Your git commits already tell the story. Add context with quick notes,
                then generate professional updates for any audience.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link href="/auth/sign-up">
                <Button size="lg" className="text-lg px-10 h-14 gap-2">
                  Start shipping updates
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              Free to start. No credit card required.
            </p>
          </div>

          {/* How It Works */}
          <div className="space-y-8">
            <h2 className="font-mono text-3xl md:text-4xl font-bold text-center">
              How it works
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl border border-foreground/10 bg-card">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <GitCommit className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono font-semibold text-xl">1. Connect your repos</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Link your git repositories. Shipshow automatically captures your commits as evidence of work done.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl border border-foreground/10 bg-card">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono font-semibold text-xl">2. Add quick notes</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Jot down context, wins, or blockers. No titles, no structure required. Just capture what matters.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl border border-foreground/10 bg-card">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono font-semibold text-xl">3. Generate for anyone</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Create updates tailored for your team, manager, client, or public audience. Same work, different lens.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="space-y-8">
            <h2 className="font-mono text-3xl md:text-4xl font-bold text-center">
              Built for how you actually work
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Weekly standups</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Stop scrambling Friday afternoon trying to remember what you did all week.
                  Generate a complete summary from your actual work.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Client reports</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Transform technical git commits into clear progress updates clients understand and value.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Performance reviews</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Build your case with concrete evidence. Your commits prove what you shipped.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl border border-foreground/10 bg-card">
                <h3 className="font-mono font-semibold text-xl">Public updates</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Share your progress on LinkedIn, Twitter, or your blog. Build in public with confidence.
                </p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center space-y-6 py-12">
            <h2 className="font-mono text-3xl md:text-4xl font-bold">
              Ready to ship better updates?
            </h2>
            <p className="text-xl text-muted-foreground">
              Start showing your work in minutes.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-10 h-14 gap-2">
                Get started free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="w-full border-t py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Shipshow</p>
        </div>
      </footer>
    </main>
  );
}
