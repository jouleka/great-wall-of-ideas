import React, { useCallback, useState, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from 'next/dynamic'
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { Idea } from "@/lib/types/idea"
import { useRouter } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"

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
  target_audience: string;
  category: string;
  tags: string;
  is_anonymous: boolean;
  is_private: boolean;
}

const STORAGE_KEY = 'idea-form-draft'

function sanitizeText(text: string, allowHtml: boolean = false) {
  if (!text) return '';
  
  if (allowHtml) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
    return clean;
  }
  
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/javascript:/gi, '[removed]')
    .replace(/data:/gi, '[removed]')
    .replace(/vbscript:/gi, '[removed]');
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
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormInputs>()
  const [description, setDescription] = useState('')
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const formData = JSON.parse(savedData) as FormInputs
        Object.entries(formData).forEach(([key, value]) => {
          setValue(key as keyof FormInputs, value as string | boolean)
        })
      } catch (error) {
        console.error('Error loading saved form data:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [setValue])

  const formValues = watch()
  useEffect(() => {
    if (Object.values(formValues).some(value => value)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formValues))
    }
  }, [formValues])

  const onSubmit: SubmitHandler<FormInputs> = useCallback(async (data: FormInputs) => {
    if (!user?.profile) {
      toast.error("Please sign in to share your idea")
      return
    }

    setIsSubmitting(true)
    try {
      await createIdea({ 
        title: sanitizeText(data.title),
        description: sanitizeText(description, true),
        target_audience: sanitizeText(data.target_audience),
        category: sanitizeText(data.category),
        tags: formatTags(data.tags),
        user_id: user.id,
        author_name: data.is_anonymous ? "Anonymous" : (user.profile.username || "Unknown"),
        status: "pending",
        is_featured: false,
        is_anonymous: data.is_anonymous,
        is_private: data.is_private
      })

      reset()
      setDescription('')
      localStorage.removeItem(STORAGE_KEY)
      setIsOpen(false)
      
      toast.success("Idea Launched!", {
        description: "Your brilliant idea is now live on the Great Wall!",
        style: {
          backgroundColor: "hsl(var(--background))",
          color: "hsl(var(--foreground))"
        }
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
  }, [user, createIdea, reset, description])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-6 rounded-lg shadow-md">
          <Rocket className="mr-2 h-5 w-5" /> Share Your Idea
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "p-0 flex flex-col overflow-hidden",
        !user ? "sm:max-w-[400px] h-auto max-h-[90vh]" : "sm:max-w-[600px] md:max-w-[800px] h-[95vh] max-h-[95vh]"
      )}>
        {!user ? (
          <div className="p-6">
            <DialogHeader className="space-y-4">
              <DialogTitle className="text-xl font-semibold text-center">
                Sign in to Share Ideas
              </DialogTitle>
              <DialogDescription className="text-sm text-center text-muted-foreground">
                Join our community to share your brilliant ideas!
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-6">
              <Button 
                onClick={() => {
                  setIsOpen(false)
                  router.push('/auth?redirectTo=/ideas')
                }}
                className="w-full"
              >
                Sign In
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/auth?mode=signup&redirectTo=/ideas')
                  }}
                >
                  Sign up
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 md:p-8">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">
                  Got a Bright Idea?
                </DialogTitle>
                <DialogDescription className="text-base sm:text-lg text-center max-w-md mx-auto">
                  Share it with the world - you never know who might build it!
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="title" className="text-base font-semibold flex items-center">
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
                      className="h-10"
                      placeholder="Enter a concise title for your idea"
                      aria-describedby="title-error"
                    />
                    {errors.title && (
                      <p id="title-error" className="text-sm text-red-500 mt-1">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description" className="text-base font-semibold flex items-center">
                      <Target className="mr-2 h-5 w-5" /> Tell Us More
                    </Label>
                    <RichTextEditor
                      content={description}
                      onChange={setDescription}
                      placeholder="Describe your idea in detail"
                      maxLength={2000}
                      error={!!errors.description}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_audience" className="text-base font-semibold flex items-center">
                      <Building className="mr-2 h-5 w-5" /> Who&apos;s It For?
                    </Label>
                    <Input
                      id="target_audience"
                      {...register("target_audience", { 
                        required: "Target audience is required",
                        minLength: {
                          value: 2,
                          message: "Target audience must be at least 2 characters"
                        },
                        maxLength: {
                          value: 50,
                          message: "Target audience must be less than 50 characters"
                        }
                      })}
                      className="h-10"
                      placeholder="e.g., Students, Netflix, Local Restaurants, Remote Workers"
                      aria-describedby="target-audience-description"
                    />
                    <p id="target-audience-description" className="text-sm text-muted-foreground">
                      Specify who would benefit from this idea (max 50 characters)
                    </p>
                    {errors.target_audience && (
                      <p id="target-audience-error" className="text-sm text-red-500 mt-1">
                        {errors.target_audience.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-base font-semibold flex items-center">
                      <Tag className="mr-2 h-5 w-5" /> Category
                    </Label>
                    <Input
                      id="category"
                      {...register("category", { 
                        required: "Category is required",
                        minLength: {
                          value: 2,
                          message: "Category must be at least 2 characters"
                        },
                        maxLength: {
                          value: 30,
                          message: "Category must be less than 30 characters"
                        }
                      })}
                      className="h-10"
                      placeholder="e.g., Technology, Education, Entertainment"
                      aria-describedby="category-description"
                    />
                    <p id="category-description" className="text-sm text-muted-foreground">
                      Choose a broad category that best fits your idea
                    </p>
                    {errors.category && (
                      <p id="category-error" className="text-sm text-red-500 mt-1">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="tags" className="text-base font-semibold flex items-center">
                      <Tag className="mr-2 h-5 w-5" /> Tags
                    </Label>
                    <Input
                      id="tags"
                      {...register("tags", {
                        pattern: {
                          value: /^[a-zA-Z0-9\s,\-_]+$/,
                          message: "Tags can only contain letters, numbers, spaces, commas, hyphens and underscores"
                        },
                        validate: {
                          maxTags: (value) => 
                            value.split(',').filter(tag => tag.trim()).length <= 8 || 
                            "Maximum 8 tags allowed",
                          tagLength: (value) => 
                            value.split(',').every(tag => {
                              const trimmed = tag.trim()
                              return trimmed.length >= 2 && trimmed.length <= 15
                            }) || 
                            "Each tag must be between 2 and 15 characters"
                        }
                      })}
                      className="h-10"
                      placeholder="e.g., mobile-app, ai, productivity (max 8 tags)"
                      aria-describedby="tags-description"
                    />
                    <p id="tags-description" className="text-sm text-muted-foreground">
                      Add up to 8 tags (2-15 chars each), separated by commas
                    </p>
                    {errors.tags && (
                      <p id="tags-error" className="text-sm text-red-500 mt-1">
                        {errors.tags.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center sm:col-span-2 pt-2 space-x-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_anonymous"
                        {...register("is_anonymous")}
                        className="mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="is_anonymous" className="text-base font-semibold flex items-center cursor-pointer">
                        <Eye className="mr-2 h-5 w-5" /> Post Anonymously
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_private"
                        {...register("is_private")}
                        className="mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="is_private" className="text-base font-semibold flex items-center cursor-pointer">
                        <Lock className="mr-2 h-5 w-5" /> Make Private
                      </Label>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-11 sm:h-12 text-base sm:text-lg rounded-lg shadow-md mt-6"
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
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
