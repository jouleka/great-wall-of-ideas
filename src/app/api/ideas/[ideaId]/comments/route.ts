import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Comment } from "@/lib/types/comment"

interface CommentWithAuthor extends Comment {
  author_avatar?: string | null
  replies?: CommentWithAuthor[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommentRow = any

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = 10
  
  try {
    const { ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // First get paginated root comments
    const { data: rootComments, error: rootError } = await supabase
      .from("comments")
      .select("*, comment_likes!left(user_id)")
      .eq("idea_id", ideaId)
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

    const { count: totalRootComments, error: countError } = await supabase
      .from("comments")
      .select("*", { count: 'exact', head: true })
      .eq("idea_id", ideaId)
      .is("parent_id", null)

    if (countError) {
      console.error('Error getting comment count:', countError)
      return NextResponse.json({ 
        comments: [],
        error: countError.message 
      }, { status: 500 })
    }

    const { data: allReplies, error: repliesError } = await supabase
      .from("comments")
      .select("*, comment_likes!left(user_id)")
      .eq("idea_id", ideaId)
      .not("parent_id", "is", null)
      .order("created_at", { ascending: true })

    if (repliesError) {
      console.error('Error fetching replies:', repliesError)
      return NextResponse.json({ 
        comments: [],
        error: repliesError.message 
      }, { status: 500 })
    }

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

    const commentsWithAvatars = allComments.map(comment => ({
      ...comment,
      author_avatar: profiles?.find((p: { id: string; avatar_url: string | null }) => p.id === comment.user_id)?.avatar_url || null,
      like_count: comment.comment_likes?.length || 0,
      is_liked: user ? comment.comment_likes?.some((like: { user_id: string }) => like.user_id === user.id) || false : false,
      replies: []
    }))

    const commentMap = new Map(commentsWithAvatars.map(c => [c.id, { ...c }]))

    // Recursive reply tree
    const buildReplyTree = (parentId: string): CommentWithAuthor[] => {
      return allReplies
        ?.filter((reply: CommentRow) => reply.parent_id === parentId)
        .map((reply: CommentRow) => {
          const replyWithAvatar = commentMap.get(reply.id)!
          replyWithAvatar.replies = buildReplyTree(reply.id)
          return replyWithAvatar
        }) || []
    }

    // Add all nested replies to their parents
    const threadedComments = rootComments?.map((root: CommentRow) => {
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
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const { ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
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
        idea_id: ideaId,
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