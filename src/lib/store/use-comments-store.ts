'use client'

import { create } from 'zustand'
import { Comment } from '@/lib/types/comment'

interface CommentsState {
  comments: { [ideaId: string]: Comment[] }
  isLoading: boolean
  hasMore: { [ideaId: string]: boolean }
  error: Error | null
}

interface CommentsActions {
  setComments: (ideaId: string, comments: Comment[]) => void
  addComment: (ideaId: string, comment: Comment) => void
  updateComment: (ideaId: string, commentId: string, updates: Partial<Comment>) => void
  removeComment: (ideaId: string, commentId: string) => void
  setLoading: (isLoading: boolean) => void
  setHasMore: (ideaId: string, hasMore: boolean) => void
  setError: (error: Error | null) => void
  toggleLike: (ideaId: string, commentId: string) => Promise<void>
  fetchComments: (ideaId: string, page?: number) => Promise<void>
  addReply: (ideaId: string, parentId: string, reply: Comment) => void
}

export const useCommentsStore = create<CommentsState & CommentsActions>((set, get) => ({
  comments: {},
  isLoading: false,
  hasMore: {},
  error: null,

  setComments: (ideaId, comments) => 
    set(state => ({
      comments: {
        ...state.comments,
        [ideaId]: comments
      }
    })),

  addComment: (ideaId, comment) =>
    set(state => ({
      comments: {
        ...state.comments,
        [ideaId]: [comment, ...(state.comments[ideaId] || [])]
      }
    })),

  updateComment: (ideaId, commentId, updates) =>
    set(state => {
      const updateCommentInList = (comments: Comment[]): Comment[] =>
        comments.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, ...updates }
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentInList(comment.replies)
            }
          }
          return comment
        })

      return {
        comments: {
          ...state.comments,
          [ideaId]: updateCommentInList(state.comments[ideaId] || [])
        }
      }
    }),

  removeComment: (ideaId, commentId) =>
    set(state => {
      const removeCommentFromList = (comments: Comment[]): Comment[] =>
        comments.filter(comment => {
          if (comment.id === commentId) return false
          if (comment.replies) {
            comment.replies = removeCommentFromList(comment.replies)
          }
          return true
        })

      return {
        comments: {
          ...state.comments,
          [ideaId]: removeCommentFromList(state.comments[ideaId] || [])
        }
      }
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setHasMore: (ideaId, hasMore) => 
    set(state => ({
      hasMore: {
        ...state.hasMore,
        [ideaId]: hasMore
      }
    })),
  setError: (error) => set({ error }),

  addReply: (ideaId, parentId, reply) =>
    set(state => {
      const addReplyToComment = (comments: Comment[]): Comment[] =>
        comments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), reply]
            }
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: addReplyToComment(comment.replies)
            }
          }
          return comment
        })

      return {
        comments: {
          ...state.comments,
          [ideaId]: addReplyToComment(state.comments[ideaId] || [])
        }
      }
    }),

  toggleLike: async (ideaId, commentId) => {
    const state = get()
    let foundComment: Comment | undefined
    
    // Find the comment and its current like status
    const findComment = (comments: Comment[]): void => {
      for (const c of comments) {
        if (c.id === commentId) {
          foundComment = c
          return
        }
        if (c.replies) findComment(c.replies)
      }
    }
    findComment(state.comments[ideaId] || [])
    
    if (!foundComment) return

    try {
      const newLikeCount = (foundComment.like_count ?? 0) + (foundComment.is_liked ? -1 : 1)
      state.updateComment(ideaId, commentId, {
        is_liked: !foundComment.is_liked,
        like_count: newLikeCount
      })

      const response = await fetch(`/api/ideas/${ideaId}/comments/${commentId}/like`, {
        method: foundComment.is_liked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to update like')
      }

      const data = await response.json()
      
      state.updateComment(ideaId, commentId, {
        is_liked: data.is_liked,
        like_count: data.like_count
      })
    } catch (error) {
      if (foundComment) {
        state.updateComment(ideaId, commentId, {
          is_liked: foundComment.is_liked,
          like_count: foundComment.like_count
        })
      }
      console.error('Error toggling like:', error)
      throw error
    }
  },

  fetchComments: async (ideaId, page = 1) => {
    const state = get()
    if (state.isLoading) return

    state.setLoading(true)
    try {
      const response = await fetch(`/api/ideas/${ideaId}/comments?page=${page}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments')
      }
      
      const newComments = Array.isArray(data.comments) ? data.comments : []
      state.setHasMore(ideaId, data.hasMore)
      
      if (page === 1) {
        state.setComments(ideaId, newComments)
      } else {
        state.setComments(ideaId, [...(state.comments[ideaId] || []), ...newComments])
      }
    } catch (error) {
      state.setError(error instanceof Error ? error : new Error('Failed to fetch comments'))
      state.setHasMore(ideaId, false)
    } finally {
      state.setLoading(false)
    }
  }
})) 