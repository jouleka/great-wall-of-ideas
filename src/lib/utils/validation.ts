import { z } from 'zod'

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

// Base password schema
const basePasswordSchema = {
  newPassword: passwordSchema,
  confirmPassword: z.string()
}

// Password confirmation schema
export const passwordConfirmationSchema = z.object(basePasswordSchema)
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Password change schema (includes current password)
export const passwordChangeSchema = z.object({
  ...basePasswordSchema,
  currentPassword: z.string().min(1, "Current password is required"),
})

// Helper function to validate password
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  const result = passwordSchema.safeParse(password)
  if (!result.success) {
    return { 
      isValid: false, 
      error: result.error.errors[0].message 
    }
  }
  return { isValid: true }
}

// Helper function to validate password confirmation
export function validatePasswordConfirmation(newPassword: string, confirmPassword: string): { isValid: boolean; error?: string } {
  const result = passwordConfirmationSchema.safeParse({ newPassword, confirmPassword })
  if (!result.success) {
    return { 
      isValid: false, 
      error: result.error.errors[0].message 
    }
  }
  return { isValid: true }
}

// Password requirements list for UI
export const PASSWORD_REQUIREMENTS = [
  '• At least 8 characters long',
  '• Contains uppercase & lowercase letters',
  '• Contains numbers',
  '• Contains special characters'
]

// Types for form inputs
export type PasswordConfirmationInputs = z.infer<typeof passwordConfirmationSchema>
export type PasswordChangeInputs = z.infer<typeof passwordChangeSchema> 