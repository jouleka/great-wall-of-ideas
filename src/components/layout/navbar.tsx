"use client"

import Link from "next/link"
import { UserProfile } from "@/components/layout/user-profile"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils/utils"

export function Navbar({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="flex h-14 items-center justify-between px-4 md:px-8 w-full">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <span className="font-bold">Great Wall of Ideas</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserProfile />
        </div>
      </div>
    </header>
  )
} 