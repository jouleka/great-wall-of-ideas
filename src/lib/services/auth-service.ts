import { createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { validatePassword, validatePasswordConfirmation } from '@/lib/utils/validation'
import { getBaseUrl } from '@/lib/utils/get-base-url'

interface PasswordResetOptions {
  email: string
  redirectTo?: string
  captchaToken?: string | null
}

interface UpdatePasswordOptions {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
  captchaToken?: string | null
}

// Supabase Auth only verifies a CAPTCHA token once CAPTCHA protection is
// enabled for the project; until then the token is ignored.
function captchaOption(captchaToken?: string | null) {
  return captchaToken ? { captchaToken } : {}
}

export const authService = {
  async signUp(email: string, password: string, username: string, captchaToken?: string | null) {
    const supabase = createSupabaseClient()
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.com'
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username
          },
          emailRedirectTo: `${siteUrl}/auth/callback?type=signup`,
          ...captchaOption(captchaToken)
        },
      })

      if (error) throw error

      toast.success("Check your email!", {
        description: "We've sent you a confirmation link to activate your account."
      })
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error("Registration failed", {
        description: error instanceof Error ? error.message : "Please try again later."
      })
      return { user: null, error }
    }
  },

  async signIn(email: string, password: string, captchaToken?: string | null) {
    const supabase = createSupabaseClient()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaOption(captchaToken),
      })

      if (error) throw error

      toast.success("Welcome back!", {
        description: "Successfully signed in"
      })
      return { session: data.session, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please check your credentials."
      })
      return { session: null, error }
    }
  },

  async signInWithEmailOrUsername(emailOrUsername: string, password: string, captchaToken?: string | null) {
    const supabase = createSupabaseClient()
    try {
      const isEmail = emailOrUsername.includes('@')
      
      if (isEmail) {
        return await this.signIn(emailOrUsername, password, captchaToken)
      } else {
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_user_email_by_username', {
            username_input: emailOrUsername
          })

        if (emailError || !emailData) {
          throw new Error('Username not found')
        }

        return await this.signIn(emailData, password, captchaToken)
      }
    } catch (error) {
      console.error('Error in signInWithEmailOrUsername:', error)
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please check your credentials."
      })
      return { session: null, error }
    }
  },

  async signOut() {
    const supabase = createSupabaseClient()
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast.success("Signed out successfully", {
        description: "Come back soon!"
      })
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error("Error signing out", {
        description: "Please try again."
      })
      throw error
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getSession() {
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  async signInWithGoogle() {
    const supabase = createSupabaseClient()
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getBaseUrl()}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Google sign in error:', error)
      toast.error("Google sign in failed", {
        description: error instanceof Error ? error.message : "Please try again later."
      })
      return { data: null, error }
    }
  },

  async sendPasswordResetEmail({ email, redirectTo, captchaToken }: PasswordResetOptions) {
    const supabase = createSupabaseClient()
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.com'
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${siteUrl}/auth/callback?type=recovery`,
        ...captchaOption(captchaToken)
      })

      if (error) throw error

      toast.success("Password reset link sent!", {
        description: "Check your email for the reset link."
      })
      return { success: true }
    } catch (err) {
      console.error('Error sending reset email:', err)
      toast.error("Failed to send reset email", {
        description: "Please try again later."
      })
      return { success: false, error: err }
    }
  },

  async updatePassword({ currentPassword, newPassword, confirmPassword, captchaToken }: UpdatePasswordOptions) {
    const supabase = createSupabaseClient()
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
          options: captchaOption(captchaToken),
        })

        if (signInError) {
          throw new Error(
            /captcha/i.test(signInError.message)
              ? "Security check failed. Please complete it again and retry."
              : "Current password is incorrect"
          )
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
  }
}

// Named exports for backward compatibility with use-app-store
export const signUp = authService.signUp.bind(authService)
export const signIn = authService.signIn.bind(authService)
export const signInWithEmailOrUsername = authService.signInWithEmailOrUsername.bind(authService)
export const signOut = authService.signOut.bind(authService)
export const getCurrentUser = authService.getCurrentUser.bind(authService)
export const getSession = authService.getSession.bind(authService)
export const signInWithGoogle = authService.signInWithGoogle.bind(authService)
export const sendPasswordResetEmail = authService.sendPasswordResetEmail.bind(authService)
