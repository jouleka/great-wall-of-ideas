import { createSupabaseClient } from "@/lib/supabase/client"
import { Idea, RemixNode } from "../types/idea"

export const remixService = {
  async remixIdea(
    originalIdea: Idea,
    newIdea: Omit<Idea, "id" | "created_at" | "updated_at" | "upvotes" | "downvotes" | "views" | "remixed_from_id">
  ): Promise<Idea> {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Must be logged in to remix an idea")
    }

    try {
      const { data, error } = await supabase.rpc('remix_idea', {
        p_original_idea_id: originalIdea.id,
        p_title: newIdea.title,
        p_description: newIdea.description,
        p_target_audience: newIdea.target_audience,
        p_category_id: newIdea.category_id,
        p_subcategory_id: newIdea.subcategory_id,
        p_tags: newIdea.tags
      })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error remixing idea:', error)
      throw error
    }
  },

  async getRemixHistory(ideaId: string): Promise<RemixNode[]> {
    const supabase = createSupabaseClient()

    try {
      const { data, error } = await supabase.rpc('get_idea_remix_history', {
        p_idea_id: ideaId
      })

      if (error) {
        console.error('❌ Error fetching remix history:', error)
        throw error
      }

      // Convert flat list to tree structure
      const nodes = data as RemixNode[]
      const tree: RemixNode[] = []
      const lookup: Record<string, RemixNode> = {}

      nodes.forEach(node => {
        lookup[node.id] = { ...node, children: [] }
      })

      nodes.forEach(node => {
        if (node.remix_level === 0) {
          tree.push(lookup[node.id])
        } else {
          // Find parent and add as child
          const parent = nodes.find(n => 
            n.remix_level === node.remix_level - 1 && 
            new Date(n.created_at) < new Date(node.created_at)
          )
          if (parent) {
            lookup[parent.id].children?.push(lookup[node.id])
          } else {
            console.warn('⚠️ Could not find parent for node:', {
              nodeId: node.id,
              nodeTitle: node.title,
              remixLevel: node.remix_level
            })
          }
        }
      })
      return tree
    } catch (error) {
      console.error('💥 Error in getRemixHistory:', error)
      throw error
    }
  },

  async getRemixCount(ideaId: string): Promise<number> {
    const supabase = createSupabaseClient()

    try {
      const { count, error } = await supabase
        .from('idea_remixes')
        .select('*', { count: 'exact' })
        .eq('original_idea_id', ideaId)

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error('Error getting remix count:', error)
      throw error
    }
  }
} 