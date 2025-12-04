import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ideaId: string; commentId: string }> }
) {
  try {
    const { ideaId, commentId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .eq('idea_id', ideaId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', session.user.id)
      .single()

    if (existingLike) {
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)

      return NextResponse.json({
        like_count: count || 0,
        is_liked: true
      })
    }

    const { error: insertError } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: session.user.id
      })

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to add like" },
        { status: 500 }
      )
    }

    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    return NextResponse.json({
      like_count: count || 0,
      is_liked: true
    })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add like" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ideaId: string; commentId: string }> }
) {
  try {
    const { ideaId, commentId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First verify the comment exists and belongs to this idea
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .eq('idea_id', ideaId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Delete the like (if it exists)
    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', session.user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove like" },
        { status: 500 }
      )
    }

    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    return NextResponse.json({
      like_count: count || 0,
      is_liked: false
    })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove like" },
      { status: 500 }
    )
  }
} 