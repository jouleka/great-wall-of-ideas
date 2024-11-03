import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

const supabase = createClientComponentClient()

interface IdeaData {
  title: string
  description: string
  tags?: string[]
  is_anonymous?: boolean
}

export const ideaService = {
  async createIdea(data: IdeaData) {
    try {
      const { error } = await supabase
        .from('ideas')
        .insert([data])

      if (error) throw error

      toast.success("Idea created successfully!")
      return { success: true }
    } catch (err) {
      console.error('Error creating idea:', err)
      toast.error("Failed to create idea")
      return { success: false, error: err }
    }
  },

  async updateIdea(id: string, data: Partial<IdeaData>) {
    // Implementation
  },

  async deleteIdea(id: string) {
    // Implementation
  },

  async getIdeas() {
    // Implementation
  }
} 