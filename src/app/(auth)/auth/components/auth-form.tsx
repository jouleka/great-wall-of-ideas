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
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const [isAppleLoading] = useState(false)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
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

  // const handleAppleSignIn = async () => {
  //   setIsAppleLoading(true)
  //   setError(null)

  //   try {
  //     const supabase = createClientComponentClient()
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider: 'apple',
  //     })
  //     if (error) throw error
  //     toast.success("Successfully signed in with Apple!")
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to sign in with Apple')
  //     console.error(err)
  //   } finally {
  //     setIsAppleLoading(false)
  //   }
  // }

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
                    "bg-background",
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
                    "bg-background",
                    loginErrors.password && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {loginErrors.password && (
                  <p className="text-sm text-red-500">{loginErrors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
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
                    "bg-background",
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
                    "bg-background",
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
                    "bg-background",
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
                className="w-full"
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
          className="w-full bg-background hover:bg-muted"
          onClick={handleGoogleAuth}
          disabled={isGoogleLoading || isEmailLoading || isAppleLoading}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        {/* <Button
          variant="outline"
          className="w-full bg-white hover:bg-gray-50 text-black hover:text-black border border-gray-300"
          onClick={handleAppleSignIn}
          disabled={isAppleLoading || isEmailLoading || isGoogleLoading}
        >
          {isAppleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.543 11.97c-.019-2.014 1.643-2.977 1.718-3.025-0.935-1.368-2.393-1.557-2.911-1.578-1.239-.126-2.42.732-3.049.732-.629 0-1.601-.714-2.631-.695-1.354.02-2.601.787-3.296 1.998-1.406 2.438-.36 6.051 1.009 8.029.669.967 1.466 2.054 2.515 2.016 1.009-.04 1.391-.652 2.61-.652 1.219 0 1.561.652 2.63.632 1.087-.02 1.776-.988 2.441-1.957.769-1.123 1.085-2.209 1.104-2.266-.024-.01-2.118-.813-2.14-3.234z"/>
                <path d="M15.195 6.359c.556-.674.932-1.611.829-2.545-.801.033-1.771.534-2.344 1.207-.515.597-.965 1.552-.844 2.469.894.07 1.808-.456 2.359-1.131z"/>
              </svg>
              Continue with Apple
            </>
          )}
        </Button> */}

        <Button
          variant="ghost"
          className="w-full hover:bg-muted"
          onClick={handleContinueAsGuest}
          disabled={isEmailLoading || isGoogleLoading || isAppleLoading}
        >
          Just Browsing? Continue as Guest
        </Button>
      </CardFooter>
    </Card>
  )
}
