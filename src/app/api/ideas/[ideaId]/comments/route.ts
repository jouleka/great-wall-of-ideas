import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { Comment } from "@/lib/types/comment"

interface CommentWithAuthor extends Comment {
  author_avatar?: string | null
  replies?: CommentWithAuthor[]
}

export async function GET(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = 10
  
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // First get paginated root comments
    const { data: rootComments, error: rootError } = await supabase
      .from("comments")
      .select("*")
      .eq("idea_id", params.ideaId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (rootError) {
      console.error('Error fetching root comments:', rootError)
      return NextResponse.json({ 
        comments: [],
        error: rootError.message 
      }, { status: 500 })
    }

    // Get total count of root comments for pagination
    const { count: totalRootComments, error: countError } = await supabase
      .from("comments")
      .select("*", { count: 'exact', head: true })
      .eq("idea_id", params.ideaId)
      .is("parent_id", null)

    if (countError) {
      console.error('Error getting comment count:', countError)
      return NextResponse.json({ 
        comments: [],
        error: countError.message 
      }, { status: 500 })
    }

    // Get ALL replies for this idea (we'll filter them later)
    const { data: allReplies, error: repliesError } = await supabase
      .from("comments")
      .select("*")
      .eq("idea_id", params.ideaId)
      .not("parent_id", "is", null)
      .order("created_at", { ascending: true })

    if (repliesError) {
      console.error('Error fetching replies:', repliesError)
      return NextResponse.json({ 
        comments: [],
        error: repliesError.message 
      }, { status: 500 })
    }

    // Get all user profiles
    const allComments = [...(rootComments || []), ...(allReplies || [])]
    const userIds = allComments.map(comment => comment.user_id)
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ 
        comments: [],
        error: profilesError.message 
      }, { status: 500 })
    }

    // Add avatars and initialize replies array
    const commentsWithAvatars = allComments.map(comment => ({
      ...comment,
      author_avatar: profiles?.find(p => p.id === comment.user_id)?.avatar_url || null,
      replies: []
    }))

    // Create a map for faster lookups
    const commentMap = new Map(commentsWithAvatars.map(c => [c.id, { ...c }]))

    // Build the reply tree recursively
    const buildReplyTree = (parentId: string): CommentWithAuthor[] => {
      return allReplies
        ?.filter(reply => reply.parent_id === parentId)
        .map(reply => {
          const replyWithAvatar = commentMap.get(reply.id)!
          replyWithAvatar.replies = buildReplyTree(reply.id)
          return replyWithAvatar
        }) || []
    }

    // Add all nested replies to their parents
    const threadedComments = rootComments?.map(root => {
      const rootWithAvatar = commentMap.get(root.id)!
      rootWithAvatar.replies = buildReplyTree(root.id)
      return rootWithAvatar
    }) || []
    
    return NextResponse.json({ 
      comments: threadedComments,
      hasMore: (totalRootComments || 0) > page * pageSize
    })
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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // Get user's profile first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ 
        error: profileError.message 
      }, { status: 500 })
    }
    
    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        idea_id: params.ideaId,
        user_id: session.user.id,
        content: body.content,
        author_name: body.author_name,
        parent_id: body.parent_id || null
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ 
        error: insertError.message 
      }, { status: 500 })
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