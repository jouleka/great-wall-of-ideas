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

function sanitizeText(text: string) {
  if (!text) return '';
  
  // Convert line breaks to spaces and normalize whitespace
  const normalized = text
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Only remove potentially harmful HTML/script content but preserve URLs
  return normalized
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '[removed]') // Replace javascript: protocol
    .replace(/data:/gi, '[removed]') // Replace data: protocol
    .replace(/vbscript:/gi, '[removed]') // Replace vbscript: protocol
    .replace(/on\w+\s*=/gi, '[removed]') // Remove event handlers
    .replace(/style\s*=/gi, '[removed]'); // Remove style attributes
}

function formatTags(tags: string): string[] {
  const tagArray = tags
    .split(',')
    .map(tag => sanitizeText(tag).toLowerCase())
    .filter(tag => tag.length > 0)
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .slice(0, 5);

  return tagArray.length > 0 ? tagArray : ['general'];
}

export function CreateIdeaDialog({ createIdea }: CreateIdeaDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit: SubmitHandler<FormInputs> = useCallback(async (data: FormInputs) => {
    if (!user?.profile) {
      toast.error("Please sign in to share your idea")
      return
    }

    setIsSubmitting(true)
    try {
      await createIdea({ 
        title: sanitizeText(data.title),
        description: sanitizeText(data.description),
        company: sanitizeText(data.company),
        category: sanitizeText(data.category),
        tags: formatTags(data.tags),
        user_id: user.id,
        author_name: data.is_anonymous ? "Anonymous" : (user.profile.username || "Unknown"),
        status: "pending",
        is_featured: false,
        is_anonymous: data.is_anonymous
      })

      reset()
      toast.success("Idea Launched!", {
        description: "Your brilliant idea is now live on the Great Wall!"
      })
    } catch (error) {
      console.error('Error creating idea:', error)
      if (error instanceof Error) {
        if (error.message.includes("description_length")) {
          toast.error("Description must be less than 2000 characters")
        } else if (error.message.includes("title_length")) {
          toast.error("Title must be less than 100 characters") 
        } else if (error.message.includes("category_length")) {
          toast.error("Category must be less than 30 characters")
        } else if (error.message.includes("tags_length")) {
          toast.error("Maximum 5 tags allowed")
        } else {
          toast.error(error.message || "Failed to create idea. Please try again.")
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [user, createIdea, reset])

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
                minLength: {
                  value: 3,
                  message: "Title must be at least 3 characters"
                },
                maxLength: {
                  value: 100,
                  message: "Title must be less than 100 characters"
                }
              })}
              className="mt-1"
              placeholder="Give it a catchy title"
              aria-describedby="title-error"
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-lg font-semibold flex items-center">
              <Target className="mr-2 h-5 w-5" /> Tell Us More
            </Label>
            <Textarea
              id="description"
              {...register("description", {
                required: "Description is required",
                minLength: {
                  value: 20,
                  message: "Description must be at least 20 characters"
                },
                maxLength: {
                  value: 2000,
                  message: "Description must be less than 2000 characters"
                }
              })}
              className="mt-1"
              placeholder="Paint us a picture - what makes this special?"
              rows={4}
              aria-describedby="description-error"
            />
            {errors.description && (
              <p id="description-error" className="text-sm text-red-500 mt-1">
                {errors.description.message}
              </p>
            )}
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
              aria-describedby="company-error"
            />
            {errors.company && (
              <p id="company-error" className="text-sm text-red-500 mt-1">
                {errors.company.message}
              </p>
            )}
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
              aria-describedby="category-error"
            />
            {errors.category && (
              <p id="category-error" className="text-sm text-red-500 mt-1">
                {errors.category.message}
              </p>
            )}
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
              aria-describedby="tags-error"
            />
            {errors.tags && (
              <p id="tags-error" className="text-sm text-red-500 mt-1">
                {errors.tags.message}
              </p>
            )}
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
              <>
                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Add to the Great Wall
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
