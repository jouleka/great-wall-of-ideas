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
  // Send password reset email without checking email existence
  // Supabase already handles this check internally
  async sendPasswordResetEmail({ email, redirectTo }: PasswordResetOptions) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
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

  // Update password (both direct change and reset)
  async updatePassword({ currentPassword, newPassword, confirmPassword }: UpdatePasswordOptions) {
    try {
      // Validate password
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error)
      }

      // Validate confirmation
      const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword)
      if (!confirmValidation.isValid) {
        throw new Error(confirmValidation.error)
      }

      // If currentPassword is provided, verify it first
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

      // Update the password
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
  }
} 