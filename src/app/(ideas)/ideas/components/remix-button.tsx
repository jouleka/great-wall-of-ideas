'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitFork, Loader2 } from "lucide-react"
import { Idea } from "@/lib/types/idea"
import { useAuth } from "@/hooks/use-auth"
import { useRemixStore } from "@/lib/store/use-remix-store"
import { useIdeasStore } from "@/lib/store/use-ideas-store"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/utils'

interface RemixButtonProps {
  idea: Idea
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
}

export function RemixButton({ idea, size = 'default', variant = 'ghost', className }: RemixButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { remixIdea, isLoading } = useRemixStore()
  const { setSortType } = useIdeasStore()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState(idea.title)
  const [description, setDescription] = useState(idea.description)
  const [targetAudience, setTargetAudience] = useState(idea.target_audience)

  const handleRemix = async () => {
    if (!user) {
      toast.error("Please sign in to remix ideas", {
        action: {
          label: "Sign In",
          onClick: () => router.push('/auth?redirectTo=/ideas')
        }
      })
      return
    }

    try {
      await remixIdea(idea, {
        title,
        description,
        target_audience: targetAudience,
        category_id: idea.category_id,
        subcategory_id: idea.subcategory_id,
        tags: idea.tags,
        user_id: user.id,
        author_name: user.profile?.username || "Unknown",
        status: 'draft',
        status_updated_at: new Date().toISOString(),
        status_updated_by: user.id,
        is_featured: false,
        is_anonymous: false,
        is_private: true, // remixed ideas are private by default
        current_viewers: 0,
        engagement_score: 0,
        last_interaction_at: new Date().toISOString()
      })

      setIsOpen(false)
      toast.success('Idea remixed successfully!')
      
      setSortType('my_ideas')
    } catch (error) {
      console.error('Error remixing idea:', error)
      toast.error('Failed to remix idea. Please try again.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={cn(
            "gap-2",
            size === 'sm' && "h-8",
            className
          )}
        >
          <GitFork className={cn(
            "text-muted-foreground",
            size === 'sm' ? "h-4 w-4" : "h-5 w-5"
          )} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Remix This Idea</DialogTitle>
          <DialogDescription>
            Create your own version of this idea. The remixed idea will be private by default.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] px-1">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your remix a title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Describe your remixed idea"
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who is this remixed idea for?"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemix}
                disabled={isLoading || !title.trim() || !description.trim() || !targetAudience.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Remixing...
                  </>
                ) : (
                  <>
                    <GitFork className="mr-2 h-4 w-4" />
                    Create Remix
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 