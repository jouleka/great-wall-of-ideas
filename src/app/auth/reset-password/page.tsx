"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please ensure both passwords are identical."
      })
      return
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      toast.error("Invalid password format", {
        description: "Password must be at least 8 characters long, contain 1 number and 1 uppercase letter"
      })
      return
    }

    setIsResetting(true)

    try {
      // Update the password using the recovery token
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword,
      })

      if (error) throw error

      toast.success("Password updated successfully!", {
        description: "Please log in with your new password."
      })
      router.push('/auth')
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error("Failed to reset password", {
        description: "Please try again or request a new reset link."
      })
    } finally {
      setIsResetting(false)
    }
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
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={isResetting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isResetting}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isResetting || !newPassword || !confirmPassword}
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
