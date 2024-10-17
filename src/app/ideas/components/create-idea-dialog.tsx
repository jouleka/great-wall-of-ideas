import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Lightbulb, Sparkles, Rocket, Target, Building, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/auth/hooks/use-auth"
import { motion } from "framer-motion"

interface CreateIdeaDialogProps {
  createIdea: (newIdea: { title: string; description: string; company: string; category: string; user_id: string }) => Promise<void>
}

export function CreateIdeaDialog({ createIdea }: CreateIdeaDialogProps) {
  const [newIdea, setNewIdea] = useState({
    title: "",
    description: "",
    company: "",
    category: ""
  })
  const { toast } = useToast()
  const { user } = useAuth()

  const handleCreateIdea = async () => {
    if (!user) {
      toast({
        title: "Hold on!",
        description: "You need to be logged in to share your brilliant idea.",
        variant: "destructive"
      })
      return
    }

    if (!newIdea.title || !newIdea.description || !newIdea.company || !newIdea.category) {
      toast({
        title: "Oops!",
        description: "Make sure to fill in all the fields to bring your idea to life!",
        variant: "destructive"
      })
      return
    }

    try {
      await createIdea({ ...newIdea, user_id: user.id })
      setNewIdea({ title: "", description: "", company: "", category: "" })
      toast({
        title: "Idea Launched!",
        description: "Your brilliant idea is now live on the Great Wall!",
      })
    } catch (error) {
      console.error('Error creating idea:', error)
      toast({
        title: "Uh-oh!",
        description: "We couldn't add your idea right now. Give it another shot!",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-6 rounded-lg shadow-md">
            <Rocket className="mr-2 h-5 w-5" /> Share Your Idea
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Someone will build it</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div>
            <Label htmlFor="title" className="text-lg font-semibold flex items-center">
              <Lightbulb className="mr-2 h-5 w-5" /> Idea Title
            </Label>
            <Input
              id="title"
              value={newIdea.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIdea({ ...newIdea, title: e.target.value })}
              className="mt-1"
              placeholder="What's your groundbreaking idea?"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-lg font-semibold flex items-center">
              <Target className="mr-2 h-5 w-5" /> Description
            </Label>
            <Textarea
              id="description"
              value={newIdea.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewIdea({ ...newIdea, description: e.target.value })}
              className="mt-1"
              placeholder="Tell us more about your innovative concept"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="company" className="text-lg font-semibold flex items-center">
              <Building className="mr-2 h-5 w-5" /> Company
            </Label>
            <Input
              id="company"
              value={newIdea.company}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIdea({ ...newIdea, company: e.target.value })}
              className="mt-1"
              placeholder="Where did this idea originate?"
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-lg font-semibold flex items-center">
              <Tag className="mr-2 h-5 w-5" /> Category
            </Label>
            <Input
              id="category"
              value={newIdea.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIdea({ ...newIdea, category: e.target.value })}
              className="mt-1"
              placeholder="e.g., Tech, Health, Education"
            />
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button onClick={handleCreateIdea} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-6 rounded-lg shadow-md">
              <Sparkles className="mr-2 h-5 w-5" /> Add to the Great Wall
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}