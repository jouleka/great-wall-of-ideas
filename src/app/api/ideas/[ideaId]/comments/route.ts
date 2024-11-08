import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = 10
  
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // First get the comments
    const { data: comments, error } = await supabase
      .from("comments")
      .select("*")
      .eq("idea_id", params.ideaId)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
    
    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    // Then get the profiles for these users
    const userIds = comments?.map(comment => comment.user_id) || []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds)

    // Map profiles to comments
    const commentsWithAvatars = comments?.map(comment => ({
      ...comment,
      author_avatar: profiles?.find(p => p.id === comment.user_id)?.avatar_url || null
    }))
    
    return NextResponse.json({ comments: commentsWithAvatars })
  } catch (error) {
    console.error('Full error details:', error)
    return NextResponse.json({ 
      comments: [],
      error: error instanceof Error ? error.message : "Failed to fetch comments"
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // Get user's profile first
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single()
    
    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        idea_id: params.ideaId,
        user_id: session.user.id,
        content: body.content,
        author_name: body.author_name
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    // Add the avatar to the response
    const commentWithAvatar = {
      ...comment,
      author_avatar: profile?.avatar_url || null
    }
    
    return NextResponse.json(commentWithAvatar)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
} 