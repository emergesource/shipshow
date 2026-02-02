"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
}

export function NavLink({ href, icon: Icon, children, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/protected" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "font-mono text-sm flex items-center gap-2 transition-colors",
        isActive
          ? "text-primary font-semibold"
          : "hover:text-primary"
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
