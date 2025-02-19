"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { authService } from "@/lib/services/auth-service"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils/utils'
import { passwordConfirmationSchema, PASSWORD_REQUIREMENTS, type PasswordConfirmationInputs } from '@/lib/utils/validation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ResetPassword() {
  const [isResetting, setIsResetting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  
  const isVerified = searchParams.get('verified') === 'true'
  
  const { register, handleSubmit, formState: { errors } } = useForm<PasswordConfirmationInputs>({
    resolver: zodResolver(passwordConfirmationSchema)
  })

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // If no session or not verified through recovery flow, redirect
        if (!session || !isVerified) {
          router.push('/auth')
          return
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Session check error:', error)
        router.push('/auth')
      }
    }

    checkSession()
  }, [isVerified, router, supabase.auth])

  const onSubmit = async (data: PasswordConfirmationInputs) => {
    setIsResetting(true)

    try {
      const { success } = await authService.updatePassword({
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      })

      if (success) {
        router.push('/auth?message=PasswordUpdated')
      }
    } catch (error) {
      console.error('Password reset error:', error)
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                {...register("newPassword")}
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                disabled={isResetting}
                className={cn(
                  errors.newPassword && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                {...register("confirmPassword")}
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                disabled={isResetting}
                className={cn(
                  errors.confirmPassword && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <ul className="text-xs text-muted-foreground space-y-1 mt-2">
              {PASSWORD_REQUIREMENTS.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
