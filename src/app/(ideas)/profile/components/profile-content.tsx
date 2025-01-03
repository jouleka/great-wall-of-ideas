"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { motion } from "framer-motion"
import { Check, Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils/utils"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { authService } from "@/lib/services/auth-service"
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { passwordChangeSchema, PASSWORD_REQUIREMENTS, type PasswordChangeInputs } from '@/lib/utils/validation'

interface ProfileFormData {
  full_name: string
  username: string
  website: string
  bio: string
}

interface ValidationErrors {
  username?: string
  website?: string
}

export function ProfileContent() {
  const { user, refreshUser } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    username: '',
    website: '',
    bio: ''
  })
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [initialFormData, setInitialFormData] = useState<ProfileFormData>({
    full_name: '',
    username: '',
    website: '',
    bio: ''
  })
  
  const supabase = createClientComponentClient()
  const debouncedFormData = useDebounce(formData, 500)
  const router = useRouter()

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors } } = 
    useForm<PasswordChangeInputs>({
      resolver: zodResolver(passwordChangeSchema)
    })

  // Load profile data when component mounts
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      setIsLoading(true)
      
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name, username, website, bio')
          .eq('id', user.id)
          .single()
        
        if (fetchError) throw fetchError
        
        if (data) {
          const initialData = {
            full_name: data.full_name || '',
            username: data.username || '',
            website: data.website || '',
            bio: data.bio || ''
          }
          setFormData(initialData)
          setInitialFormData(initialData) // Store initial data
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        toast.error("Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProfile()
  }, [user?.id, supabase])

  // Validate username uniqueness
  useEffect(() => {
    async function validateUsername() {
      if (!debouncedFormData.username || debouncedFormData.username === user?.profile?.username) {
        setErrors(prev => ({ ...prev, username: undefined }))
        return
      }

      try {
        const { data, error: usernameError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', debouncedFormData.username)
          .neq('id', user?.id)
          .single()

        if (usernameError) {
          // If error is not found, username is available
          if (usernameError.code === 'PGRST116') {
            setErrors(prev => ({ ...prev, username: undefined }))
          }
        } else if (data) {
          setErrors(prev => ({ ...prev, username: 'Username already taken' }))
        }
      } catch (err) {
        console.error('Error validating username:', err)
      }
    }

    validateUsername()
  }, [debouncedFormData.username, user?.id, user?.profile?.username, supabase])

  // Validate website URL
  useEffect(() => {
    if (!debouncedFormData.website) {
      setErrors(prev => ({ ...prev, website: undefined }))
      return
    }

    try {
      new URL(debouncedFormData.website)
      setErrors(prev => ({ ...prev, website: undefined }))
    } catch {
      setErrors(prev => ({ ...prev, website: 'Please enter a valid URL' }))
    }
  }, [debouncedFormData.website])

  if (!user?.profile) return null
  
  function handleChange(field: keyof ProfileFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return

    setIsSaving(true)
    const previousData = { ...formData }

    try {
      // First validate the data
      if (formData.username.length < 3) {
        throw new Error('Username must be at least 3 characters')
      }

      // Update the profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          username: formData.username.trim(),
          website: formData.website.trim(),
          bio: formData.bio.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        // Check for unique constraint violation
        if (updateError.code === '23505') {
          throw new Error('Username already taken')
        }
        throw updateError
      }
      
      // Update initialFormData with the new values after successful save
      setInitialFormData({
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        website: formData.website.trim(),
        bio: formData.bio.trim()
      })
      
      // Refresh the user data in the auth context
      await refreshUser()
      toast.success("Profile updated successfully!")
    } catch (err) {
      console.error('Error updating profile:', err)
      setFormData(previousData) // Rollback on error
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  // Add a function to check if form is valid
  function hasFormChanges(): boolean {
    return (
      initialFormData.full_name.trim() !== formData.full_name.trim() ||
      initialFormData.username.trim() !== formData.username.trim() ||
      initialFormData.website.trim() !== formData.website.trim() ||
      initialFormData.bio.trim() !== formData.bio.trim()
    )
  }

  function isFormValid() {
    // First check if there are any changes
    if (!hasFormChanges()) {
      return false
    }

    // Then check other validation rules
    if (!formData.username || errors.username) {
      return false
    }

    if (formData.website && errors.website) {
      return false
    }

    return true
  }

  async function handlePasswordReset() {
    if (!user?.email) return
    
    setIsResettingPassword(true)
    setIsUpdatingPassword(false)
    
    await authService.sendPasswordResetEmail({ 
      email: user.email 
    })
    
    setIsResettingPassword(false)
  }

  const onPasswordSubmit: SubmitHandler<PasswordChangeInputs> = async (data) => {
    if (!user?.email) return
    
    setIsUpdatingPassword(true)
    setIsResettingPassword(false)
    setPasswordError(null)

    try {
      const { success, error } = await authService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      })

      if (success) {
        setIsPasswordDialogOpen(false)
        toast.success('Password updated successfully')
      } else if (error) {
        setPasswordError(error instanceof Error ? error.message : "Failed to update password")
      }
    } catch (error) {
      console.error('Error updating password:', error)
      setPasswordError('An unexpected error occurred')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/50">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="px-4 sm:px-0"
    >
      <form onSubmit={handleSubmit}>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <span>Profile Information</span>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm sm:text-base">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  className="bg-background h-9 sm:h-10"
                  disabled={isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm sm:text-base">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={e => handleChange('username', e.target.value)}
                  className={cn("bg-background h-9 sm:h-10", errors.username && "border-destructive")}
                  disabled={isSaving}
                  aria-invalid={!!errors.username}
                />
                {errors.username && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.username}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-sm sm:text-base">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={e => handleChange('website', e.target.value)}
                className={cn("bg-background h-9 sm:h-10", errors.website && "border-destructive")}
                disabled={isSaving}
                aria-invalid={!!errors.website}
              />
              {errors.website && (
                <p className="text-xs sm:text-sm text-destructive">{errors.website}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm sm:text-base">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={4}
                className="bg-background resize-none min-h-[100px] sm:min-h-[120px]"
                disabled={isSaving}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.bio.length}/500
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 sm:gap-2 pt-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => router.push('/ideas')}
                className="gap-2 h-9 sm:h-10 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Ideas
              </Button>

              <div className="flex flex-col sm:flex-row gap-2">
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button"
                      variant="outline"
                      className="gap-2 h-9 sm:h-10 w-full sm:w-auto"
                      onClick={() => setIsPasswordDialogOpen(true)}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl">Change Password</DialogTitle>
                    </DialogHeader>
                    <form 
                      onSubmit={handlePasswordSubmit(onPasswordSubmit)} 
                      className="space-y-4 py-4"
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-sm sm:text-base">Current Password</Label>
                          <Input
                            {...registerPassword("currentPassword")}
                            type="password"
                            placeholder="Enter your current password"
                            disabled={isResettingPassword}
                            className={cn(
                              "h-9 sm:h-10",
                              passwordErrors.currentPassword && "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                          {passwordErrors.currentPassword && (
                            <p className="text-xs sm:text-sm text-red-500">
                              {passwordErrors.currentPassword.message?.toString() || "Invalid password"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-sm sm:text-base">New Password</Label>
                          <Input
                            {...registerPassword("newPassword")}
                            type="password"
                            placeholder="Enter new password"
                            disabled={isResettingPassword}
                            className={cn(
                              "h-9 sm:h-10",
                              passwordErrors.newPassword && "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                          {passwordErrors.newPassword && (
                            <p className="text-xs sm:text-sm text-red-500">
                              {passwordErrors.newPassword.message?.toString() || "Invalid password"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm New Password</Label>
                          <Input
                            {...registerPassword("confirmPassword")}
                            type="password"
                            placeholder="Confirm new password"
                            disabled={isResettingPassword}
                            className={cn(
                              "h-9 sm:h-10",
                              passwordErrors.confirmPassword && "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                          {passwordErrors.confirmPassword && (
                            <p className="text-xs sm:text-sm text-red-500">
                              {passwordErrors.confirmPassword.message?.toString() || "Passwords don't match"}
                            </p>
                          )}
                        </div>
                        {passwordError && (
                          <p className="text-xs sm:text-sm text-destructive">{passwordError}</p>
                        )}
                      </div>
                      
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        {PASSWORD_REQUIREMENTS.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>

                      <div className="flex flex-col gap-4">
                        <Button
                          type="submit"
                          disabled={isUpdatingPassword || isResettingPassword}
                          className="h-9 sm:h-10"
                        >
                          {isUpdatingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Update Password'
                          )}
                        </Button>
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              Or
                            </span>
                          </div>
                        </div>

                        <div className="text-center space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Forgot your password?
                          </p>
                          <Button
                            variant="outline"
                            onClick={handlePasswordReset}
                            disabled={isResettingPassword}
                            className="h-9 sm:h-10 w-full"
                          >
                            {isResettingPassword ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send Reset Link to Email'
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            We&apos;ll send a reset link to: <span className="font-medium">{user?.email}</span>
                          </p>
                        </div>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button 
                  type="submit" 
                  disabled={isSaving || !isFormValid()}
                  className="h-9 sm:h-10 min-w-[120px] w-full sm:w-auto"
                >
                  {isSaving ? 'Saving...' : hasFormChanges() ? 'Save Changes' : 'No Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  )
}
