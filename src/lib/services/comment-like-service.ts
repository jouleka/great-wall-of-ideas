import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"

export class CommentLikeService {
  static async getLikeCount(commentId: string): Promise<number> {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { count, error } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    if (error) throw error
    return count || 0
  }

  static async isLikedByUser(commentId: string, userId: string): Promise<boolean> {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }

  static async addLike(commentId: string, userId: string) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // First check if the like already exists
    const { data: existingLike, error: existingError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') throw existingError

    if (existingLike) {
      return {
        like_count: await this.getLikeCount(commentId),
        is_liked: true
      }
    }

    const { error: insertError } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: userId
      })

    if (insertError) throw insertError

    return {
      like_count: await this.getLikeCount(commentId),
      is_liked: true
    }
  }

  static async removeLike(commentId: string, userId: string) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    return {
      like_count: await this.getLikeCount(commentId),
      is_liked: false
    }
  }

  static async getLikeStatus(commentId: string, userId?: string) {
    const like_count = await this.getLikeCount(commentId)
    const is_liked = userId ? await this.isLikedByUser(commentId, userId) : false

    return {
      like_count,
      is_liked
    }
  }
} 