'use client'

import { useState } from 'react'
import { useAuth } from './auth-provider'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/lib/services/auth-service'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils/utils'
import Image from 'next/image'

interface AuthFormProps {
  defaultTab?: string;
}

// Define validation schema
const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Come on, your username needs at least 3 characters")
    .max(30, "Let's keep it short and sweet - under 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Just letters, numbers, underscores, and hyphens - keeping it simple")
    .refine(
      val => !['admin', 'administrator', 'superadmin', 'root'].includes(val.toLowerCase()),
      "That username is reserved - try something more personal!"
    ),

  email: z
    .string()
    .email("Hmm, that doesn't look like a valid email")
    .min(5, "Your email seems a bit too short")
    .max(254, "That's quite a long email you've got there")
    .refine(
      val => !['@temp.com', '@tempmail.com', '@mailinator.com', '@disposable.com'].some(domain => val.endsWith(domain)),
      "We'd prefer a real email - we promise to be nice!"
    ),

  password: z
    .string()
    .min(8, "Eight characters minimum - security first!")
    .max(100, "That's a bit long for a password, don't you think?")
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password needs an uppercase letter, lowercase letter, number, and special character"
    )
})

type RegisterInputs = z.infer<typeof registerSchema>

// Add login schema
const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(3, "Please enter a valid email or username")
    .max(254, "Input is too long"),
  password: z.string().min(1, "Password is required")
})

type LoginInputs = z.infer<typeof loginSchema>

export function AuthForm({ defaultTab = 'login' }: AuthFormProps) {
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [showResetForm, setShowResetForm] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInputs>({
    resolver: zodResolver(registerSchema)
  })
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors }
  } = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema)
  })

  const onLoginSubmit = async (data: LoginInputs) => {
    setIsEmailLoading(true)
    setError(null)

    try {
      await signIn(data.emailOrUsername, data.password)
      toast.success("Welcome back!")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      console.error(err)
    } finally {
      setIsEmailLoading(false)
    }
  }

  const onRegisterSubmit = async (data: RegisterInputs) => {
    setIsEmailLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { user, error } = await signUp(data.email, data.password, data.username)
      if (error) throw error
      if (user) {
        setSuccessMessage('Almost there! Check your email to complete sign up.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsEmailLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      toast.error("Please enter your email address")
      return
    }

    setIsResettingPassword(true)
    try {
      const { success } = await authService.sendPasswordResetEmail({
        email: resetEmail
      })

      if (success) {
        setShowResetForm(false)
        setResetEmail("")
      }
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      console.error(err)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleContinueAsGuest = () => {
    router.push('/ideas')
  }

  if (showResetForm) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Forgot Your Password?</CardTitle>
          <CardDescription>
            No worries! Pop in your email and we&apos;ll help you get back in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="bg-white/50"
              />
            </div>
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowResetForm(false)}
                disabled={isResettingPassword}
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">
          Hey there! 👋
        </CardTitle>
        <CardDescription className="text-center text-secondary-foreground">
          Ready to share your brilliant ideas with the world?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Join Us</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  {...registerLogin("emailOrUsername")}
                  id="emailOrUsername"
                  placeholder="Type your email or username"
                  className={cn(
                    "bg-white/50",
                    loginErrors.emailOrUsername && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {loginErrors.emailOrUsername && (
                  <p className="text-sm text-red-500">{loginErrors.emailOrUsername.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  {...registerLogin("password")}
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className={cn(
                    "bg-white/50",
                    loginErrors.password && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {loginErrors.password && (
                  <p className="text-sm text-red-500">{loginErrors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full text-white"
                disabled={isEmailLoading}
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setShowResetForm(true)}
              >
                Forgot your password?
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  {...register("username")}
                  id="username"
                  placeholder="Choose a username"
                  className={cn(
                    "bg-white/50",
                    errors.username && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={cn(
                    "bg-white/50",
                    errors.email && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  {...register("password")}
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  className={cn(
                    "bg-white/50",
                    errors.password && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  <li>• At least 8 characters long</li>
                  <li>• Mix of upper & lowercase letters</li>
                  <li>• Some numbers for good measure</li>
                  <li>• A special character to spice it up</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full text-white"
                disabled={isEmailLoading}
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {successMessage && <p className="text-green-500 text-center mt-4">{successMessage}</p>}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-primary/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Quick access with</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full bg-white hover:bg-gray-100"
          onClick={handleGoogleAuth}
          disabled={isGoogleLoading || isEmailLoading}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Image
                src="/google.svg"
                alt="Google"
                width={16}
                height={16}
                className="mr-2"
              />
              Continue with Google
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleContinueAsGuest}
          disabled={isEmailLoading || isGoogleLoading}
        >
          Just Browsing? Continue as Guest
        </Button>
      </CardFooter>
    </Card>
  )
}
