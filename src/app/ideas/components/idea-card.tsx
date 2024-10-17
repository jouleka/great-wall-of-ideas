"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronUp, ChevronDown, Award, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Idea } from "../types/idea"
import { getIdeaIcon, getIdeaBadge } from "../utils/ideaUtils"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/auth/hooks/use-auth"

interface IdeaCardProps {
  idea: Idea
  ideas: Idea[]
  onVote: (id: number, increment: boolean) => void
}

export function IdeaCard({ idea, ideas, onVote }: IdeaCardProps) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const ideaIcon = getIdeaIcon(idea, ideas)
  const ideaBadge = getIdeaBadge(idea, ideas)

  const handleVote = (increment: boolean) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to vote.",
        variant: "destructive"
      })
      return
    }
    onVote(idea.id, increment)
    toast({
      title: increment ? "Idea Supported!" : "Support Withdrawn",
      description: "Your vote has been recorded.",
    })
  }

  const IconComponent = ideaIcon as any // Type assertion for dynamic component

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex"
    >
      <Card className="flex flex-col justify-between w-full hover:shadow-lg transition-shadow duration-300 bg-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <IconComponent className={`w-5 h-5 text-${ideaIcon.toLowerCase()}-500`} />
            {ideaBadge && (
              <Badge variant="secondary" className={`bg-${ideaBadge.variant}-100 text-${ideaBadge.variant}-800`}>
                {ideaBadge.text}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {idea.title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground flex items-center">
            <Award className="w-4 h-4 mr-1 text-blue-500" />
            {idea.company}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-card-foreground line-clamp-3">{idea.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center mt-auto pt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setSelectedIdea(idea)}>
                Explore Idea
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconComponent className={`w-5 h-5 text-${ideaIcon.toLowerCase()}-500`} />
                  {idea.title}
                </DialogTitle>
                <DialogDescription>{idea.company}</DialogDescription>
              </DialogHeader>
              <p className="text-card-foreground mt-2">{idea.description}</p>
              <div className="flex justify-between items-center mt-4">
                <Badge variant="secondary" className="flex items-center">
                  <Flame className="w-4 h-4 mr-1 text-orange-500" />
                  {idea.votes} supports
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSelectedIdea(null)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleVote(true)}>
                    <ChevronUp className="h-4 w-4 text-green-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Support this idea</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-semibold text-card-foreground">{idea.votes}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleVote(false)}>
                    <ChevronDown className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Withdraw support</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
