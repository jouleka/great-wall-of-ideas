export interface Idea {
  id: number
  title: string
  description: string
  votes: number
  company: string
  category: string
  trend: "rising" | "falling" | "stable"
  createdAt: Date
}