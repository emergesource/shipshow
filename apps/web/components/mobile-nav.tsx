"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/nav-link";
import { Menu, X, LayoutDashboard, FolderGit2, FileText, GitBranch, Users, Sparkles, Send } from "lucide-react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b border-foreground/10 md:hidden z-50">
          <nav className="flex flex-col p-4 space-y-1">
            <div className="p-2">
              <NavLink href="/protected" icon={LayoutDashboard} onClick={() => setIsOpen(false)}>
                Dashboard
              </NavLink>
            </div>
            <div className="p-2">
              <NavLink href="/protected/projects" icon={FolderGit2} onClick={() => setIsOpen(false)}>
                Projects
              </NavLink>
            </div>
            <div className="p-2">
              <NavLink href="/protected/notes" icon={FileText} onClick={() => setIsOpen(false)}>
                Notes
              </NavLink>
            </div>
            <div className="p-2">
              <NavLink href="/protected/repositories" icon={GitBranch} onClick={() => setIsOpen(false)}>
                Repos
              </NavLink>
            </div>
            <div className="p-2">
              <NavLink href="/protected/audiences" icon={Users} onClick={() => setIsOpen(false)}>
                Audiences
              </NavLink>
            </div>
            <div className="p-2">
              <NavLink href="/protected/summaries" icon={Sparkles} onClick={() => setIsOpen(false)}>
                Summaries
              </NavLink>
            </div>
            <div className="p-2">
              <NavLink href="/protected/messages" icon={Send} onClick={() => setIsOpen(false)}>
                Messages
              </NavLink>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
