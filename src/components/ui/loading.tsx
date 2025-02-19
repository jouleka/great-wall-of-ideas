"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/utils"

interface LoadingProps {
  text?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
}

export function Loading({ text = "Loading...", className, size = "md" }: LoadingProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 space-y-2",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-primary",
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
} 