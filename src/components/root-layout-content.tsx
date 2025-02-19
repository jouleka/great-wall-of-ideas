'use client'

import { useInitStore } from "@/hooks/use-init-store"

interface RootLayoutContentProps {
  children: React.ReactNode
}

export function RootLayoutContent({ children }: RootLayoutContentProps) {
  useInitStore()

  return children
} 