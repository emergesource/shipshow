"use client";

import { NavLink } from "@/components/nav-link";
import { LayoutDashboard, FolderGit2, FileText, GitBranch, Users, Sparkles, Send } from "lucide-react";

export function MainNav() {
  return (
    <nav className="w-full border-b border-b-foreground/10 bg-accent/30">
      <div className="max-w-7xl mx-auto">
        <div className="hidden md:flex items-center gap-8 px-6 py-3">
          <NavLink href="/protected" icon={LayoutDashboard}>
            Dashboard
          </NavLink>
          <NavLink href="/protected/projects" icon={FolderGit2}>
            Projects
          </NavLink>
          <NavLink href="/protected/notes" icon={FileText}>
            Notes
          </NavLink>
          <NavLink href="/protected/repositories" icon={GitBranch}>
            Repos
          </NavLink>
          <NavLink href="/protected/audiences" icon={Users}>
            Audiences
          </NavLink>
          <NavLink href="/protected/summaries" icon={Sparkles}>
            Summaries
          </NavLink>
          <NavLink href="/protected/messages" icon={Send}>
            Messages
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
