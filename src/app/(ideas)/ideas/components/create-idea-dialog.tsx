import React, { useCallback, useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import dynamic from 'next/dynamic'
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { Idea } from "@/lib/types/idea"
import { useRouter } from 'next/navigation'

const Lightbulb = dynamic(() => import('lucide-react').then((mod) => mod.Lightbulb))
const Sparkles = dynamic(() => import('lucide-react').then((mod) => mod.Sparkles))
const Rocket = dynamic(() => import('lucide-react').then((mod) => mod.Rocket))
const Target = dynamic(() => import('lucide-react').then((mod) => mod.Target))
const Building = dynamic(() => import('lucide-react').then((mod) => mod.Building))
const Tag = dynamic(() => import('lucide-react').then((mod) => mod.Tag))
const Eye = dynamic(() => import('lucide-react').then((mod) => mod.Eye))

interface CreateIdeaDialogProps {
  createIdea: (newIdea: Omit<Idea, "id" | "created_at" | "updated_at" | "upvotes" | "downvotes" | "views">) => Promise<void>
}

type FormInputs = {
  title: string;
  description: string;
  company: string;
  category: string;
  tags: string;
  is_anonymous: boolean;
}

export function CreateIdeaDialog({ createIdea }: CreateIdeaDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>()
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit: SubmitHandler<FormInputs> = useCallback(async (data: FormInputs) => {
    if (!user || !user.profile) {
      toast("Hold on!", {
        description: "You need to be logged in to share your brilliant idea."
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createIdea({ 
        ...data, 
        user_id: user.id, 
        author_name: data.is_anonymous ? "Anonymous" : (user.profile.username || "Unknown"),
        tags: data.tags.split(',').map((tag: string) => tag.trim()),
        status: "pending",
        is_featured: false
      })
      reset()
      toast("Idea Launched!", {
        description: "Your brilliant idea is now live on the Great Wall!"
      })
    } catch (error) {
      console.error('Error creating idea:', error)
      toast("Uh-oh!", {
        description: "We couldn't add your idea right now. Give it another shot!"
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [user, createIdea, reset])

  if (!user) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Share Your Idea
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in or create an account to share your ideas with the community.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => router.push('/auth?redirectTo=/ideas')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/auth?tab=register&redirectTo=/ideas')}>
              Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-6 rounded-lg shadow-md">
          <Rocket className="mr-2 h-5 w-5" /> Share Your Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Got a Bright Idea?
          </DialogTitle>
          <DialogDescription>
            Share it with the world - you never know who might build it!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div>
            <Label htmlFor="title" className="text-lg font-semibold flex items-center">
              <Lightbulb className="mr-2 h-5 w-5" /> What&apos;s Your Idea?
            </Label>
            <Input
              id="title"
              {...register("title", { 
                required: "Title is required",
                maxLength: { value: 100, message: "Title must be less than 100 characters" }
              })}
              className="mt-1"
              placeholder="Give it a catchy title"
              aria-invalid={errors.title ? "true" : "false"}
            />
            {errors.title && <p role="alert" className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="description" className="text-lg font-semibold flex items-center">
              <Target className="mr-2 h-5 w-5" /> Tell Us More
            </Label>
            <Textarea
              id="description"
              {...register("description", { 
                required: "Description is required",
                minLength: { value: 20, message: "Description must be at least 20 characters long" }
              })}
              className="mt-1"
              placeholder="Paint us a picture - what makes this special?"
              rows={4}
              aria-invalid={errors.description ? "true" : "false"}
            />
            {errors.description && <p role="alert" className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <Label htmlFor="company" className="text-lg font-semibold flex items-center">
              <Building className="mr-2 h-5 w-5" /> Who&apos;s It For?
            </Label>
            <Input
              id="company"
              {...register("company", { required: "Company is required" })}
              className="mt-1"
              placeholder="Which company could make this happen?"
              aria-invalid={errors.company ? "true" : "false"}
            />
            {errors.company && <p role="alert" className="text-red-500 text-sm mt-1">{errors.company.message}</p>}
          </div>
          <div>
            <Label htmlFor="category" className="text-lg font-semibold flex items-center">
              <Tag className="mr-2 h-5 w-5" /> Category
            </Label>
            <Input
              id="category"
              {...register("category", { required: "Category is required" })}
              className="mt-1"
              placeholder="e.g., Tech, Health, Education"
              aria-invalid={errors.category ? "true" : "false"}
            />
            {errors.category && <p role="alert" className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <Label htmlFor="tags" className="text-lg font-semibold flex items-center">
              <Tag className="mr-2 h-5 w-5" /> Tags
            </Label>
            <Input
              id="tags"
              {...register("tags")}
              className="mt-1"
              placeholder="Enter tags separated by commas"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_anonymous"
              {...register("is_anonymous")}
              className="mr-2"
            />
            <Label htmlFor="is_anonymous" className="text-lg font-semibold flex items-center">
              <Eye className="mr-2 h-5 w-5" /> Post Anonymously
            </Label>
          </div>
          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-6 rounded-lg shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "One moment..."
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" /> Add to the Great Wall
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
