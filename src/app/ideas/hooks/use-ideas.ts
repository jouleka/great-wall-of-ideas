import { useState, useEffect } from "react"
import { Idea } from "@/types/idea"

const mockIdeas: Idea[] = [
  { id: 1, title: "AI-Powered Personal Assistant", description: "An AI assistant that learns and adapts to your personal and professional needs.", votes: 1500, company: "TechCorp", category: "AI", trend: "rising", createdAt: new Date() },
  { id: 2, title: "Sustainable Energy Storage", description: "Revolutionary battery technology for efficient renewable energy storage.", votes: 1200, company: "GreenTech", category: "Energy", trend: "rising", createdAt: new Date() },
  { id: 3, title: "Virtual Reality Workspace", description: "A fully immersive VR office environment for remote teams.", votes: 1000, company: "FutureLabs", category: "VR", trend: "stable", createdAt: new Date() },
  { id: 4, title: "Quantum Encryption for Messaging", description: "Unbreakable encryption for secure communication using quantum technology.", votes: 800, company: "SecureComm", category: "Security", trend: "rising", createdAt: new Date() },
  { id: 5, title: "Biodegradable Packaging Solution", description: "Eco-friendly packaging that decomposes rapidly without harmful residues.", votes: 750, company: "EcoPackage", category: "Environment", trend: "falling", createdAt: new Date() },
  // Add more mock ideas here...
]

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])

  useEffect(() => {
    setIdeas(mockIdeas.map(idea => ({
      ...idea,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within the last 30 days
    })).sort((a, b) => b.votes - a.votes))
  }, [])

  const handleVote = (id: number, increment: boolean) => {
    setIdeas(prevIdeas =>
      prevIdeas.map(idea =>
        idea.id === id
          ? { ...idea, votes: idea.votes + (increment ? 1 : -1) }
          : idea
      ).sort((a, b) => b.votes - a.votes)
    )
  }

  return { ideas, handleVote }
}