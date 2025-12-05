import { createSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ProfileData {
  username: string
  full_name?: string
  website?: string
  bio?: string
}

export const profileService = {
  async updateProfile(userId: string, data: ProfileData) {
    const supabase = createSupabaseClient()
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)

      if (error) throw error

      toast.success("Profile updated successfully!")
      return { success: true }
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error("Failed to update profile")
      return { success: false, error: err }
    }
  },
} 