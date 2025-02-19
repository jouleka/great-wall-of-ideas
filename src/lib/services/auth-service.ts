import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { validatePassword, validatePasswordConfirmation } from '@/lib/utils/validation'

const supabase = createClientComponentClient()

interface PasswordResetOptions {
  email: string
  redirectTo?: string
}

interface UpdatePasswordOptions {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
}

export const authService = {
  async sendPasswordResetEmail({ email }: PasswordResetOptions) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.xyz'
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?type=recovery`
      })

      if (error) throw error

      toast.success(
        "Password reset link sent!", 
        { description: "Check your email for the reset link." }
      )
      return { success: true }
    } catch (err) {
      console.error('Error sending reset email:', err)
      toast.error(
        "Failed to send reset email", 
        { description: "Please try again later." }
      )
      return { success: false, error: err }
    }
  },

  async updatePassword({ currentPassword, newPassword, confirmPassword }: UpdatePasswordOptions) {
    try {
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error)
      }

      const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword)
      if (!confirmValidation.isValid) {
        throw new Error(confirmValidation.error)
      }

      if (currentPassword) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) throw new Error("No user found")

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        })

        if (signInError) {
          throw new Error("Current password is incorrect")
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast.success(
        "Password updated successfully!", 
        { description: "You can now use your new password to log in." }
      )
      return { success: true }
    } catch (err) {
      console.error('Error updating password:', err)
      toast.error(
        "Failed to update password",
        { description: err instanceof Error ? err.message : "Please try again later." }
      )
      return { success: false, error: err }
    }
  },

  async signInWithEmailOrUsername(emailOrUsername: string, password: string) {
    try {
      const isEmail = emailOrUsername.includes('@')
      
      if (isEmail) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrUsername,
          password,
        })
        
        if (error) throw error
        return { session: data.session, error: null }
      } else {
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_user_email_by_username', {
            username_input: emailOrUsername
          })

        if (emailError || !emailData) {
          throw new Error('Username not found')
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailData,
          password,
        })

        if (error) throw error
        return { session: data.session, error: null }
      }
    } catch (err) {
      console.error('Error in signInWithEmailOrUsername:', err)
      throw err
    }
  },

  async signInWithGoogle() {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.xyz'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      console.error('Error signing in with Google:', err)
      toast.error(
        "Google sign in failed", 
        { description: err instanceof Error ? err.message : "Please try again later." }
      )
      throw err
    }
  }
} 