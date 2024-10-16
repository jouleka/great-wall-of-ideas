import { Idea } from "../types/idea"

export function getIdeaIcon(idea: Idea, ideas: Idea[]) {
  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes)
  const topIdea = sortedIdeas[0]
  const bottomIdea = sortedIdeas[sortedIdeas.length - 1]
  const averageVotes = ideas.reduce((sum, i) => sum + i.votes, 0) / ideas.length
  const isIdeaOfTheWeek = isWithinLastWeek(idea.createdAt) && idea.votes > averageVotes * 1.5
  const isIdeaOfTheMonth = isWithinLastMonth(idea.createdAt) && idea.votes > averageVotes * 2

  if (isIdeaOfTheMonth) return "Calendar"
  if (isIdeaOfTheWeek) return "Clock"
  if (idea === topIdea) return "Star"
  if (idea === bottomIdea) return "CloudOff"
  if (idea.votes > averageVotes * 1.5) return "Flame"
  if (idea.trend === "rising") return "TrendingUp"
  if (idea.trend === "falling") return "TrendingDown"
  return "Lightbulb"
}

export function getIdeaBadge(idea: Idea, ideas: Idea[]) {
  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes)
  const topIdea = sortedIdeas[0]
  const averageVotes = ideas.reduce((sum, i) => sum + i.votes, 0) / ideas.length
  const isIdeaOfTheWeek = isWithinLastWeek(idea.createdAt) && idea.votes > averageVotes * 1.5
  const isIdeaOfTheMonth = isWithinLastMonth(idea.createdAt) && idea.votes > averageVotes * 2

  if (isIdeaOfTheMonth) return { text: "Idea of the Month", variant: "purple" }
  if (isIdeaOfTheWeek) return { text: "Idea of the Week", variant: "indigo" }
  if (idea === topIdea) return { text: "Top Idea", variant: "yellow" }
  if (idea.votes > averageVotes * 1.5) return { text: "Hot Idea", variant: "orange" }
  if (idea.trend === "rising") return { text: "Trending", variant: "green" }
  if (idea.trend === "falling") return { text: "Declining", variant: "red" }
  return null
}

export function isWithinLastWeek(date: Date) {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  return date > oneWeekAgo
}

export function isWithinLastMonth(date: Date) {
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  return date > oneMonthAgo
}
