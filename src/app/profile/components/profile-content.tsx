"use client"

import { useAuth } from "@/app/auth/hooks/use-auth"
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
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { authService } from "@/lib/services/auth-service"

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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  
  const supabase = createClientComponentClient()
  const debouncedFormData = useDebounce(formData, 500)
  const router = useRouter()

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
          setFormData({
            full_name: data.full_name || '',
            username: data.username || '',
            website: data.website || '',
            bio: data.bio || ''
          })
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
  function isFormValid() {
    // Username is the only required field and must not have errors
    if (!formData.username || errors.username) {
      return false
    }

    // Website is optional but if provided must be valid
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

  async function handleDirectPasswordChange() {
    if (!user?.email) return
    
    setIsUpdatingPassword(true)
    setIsResettingPassword(false)
    setPasswordError(null)

    const { success, error } = await authService.updatePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword
    })

    if (success) {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setIsPasswordDialogOpen(false)
    } else if (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to update password")
    }
    
    setIsUpdatingPassword(false)
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
    >
      <form onSubmit={handleSubmit}>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Profile Information</span>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  className="bg-background"
                  disabled={isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={e => handleChange('username', e.target.value)}
                  className={cn("bg-background", errors.username && "border-destructive")}
                  disabled={isSaving}
                  aria-invalid={!!errors.username}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={e => handleChange('website', e.target.value)}
                className={cn("bg-background", errors.website && "border-destructive")}
                disabled={isSaving}
                aria-invalid={!!errors.website}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={4}
                className="bg-background resize-none"
                disabled={isSaving}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.bio.length}/500
              </p>
            </div>

            <div className="flex justify-between items-center">
              <Button 
                type="button"
                variant="outline"
                onClick={() => router.push('/ideas')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Ideas
              </Button>

              <div className="flex gap-2">
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setIsPasswordDialogOpen(true)}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={e => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter your current password"
                            disabled={isResettingPassword}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter new password"
                            disabled={isResettingPassword}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm new password"
                            disabled={isResettingPassword}
                          />
                        </div>
                        {passwordError && (
                          <p className="text-sm text-destructive">{passwordError}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <Button
                          onClick={handleDirectPasswordChange}
                          disabled={isUpdatingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
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
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  type="submit" 
                  disabled={isSaving || !isFormValid()}
                  className="min-w-[120px]"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  )
}
