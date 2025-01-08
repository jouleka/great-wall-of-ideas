"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, LogIn, Bell } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/utils"
import { getInitials } from "@/lib/utils/string-utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const MAX_DISPLAY_NAME_LENGTH = 20
const MAX_USERNAME_LENGTH = 25

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut, isLoading } = useAuth()
  const [avatarError, setAvatarError] = useState(false)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    )
  }

  if (!user) {
    return (
      <Link href="/auth">
        <Button variant="outline" className="relative h-10 px-4 rounded-full">
          <LogIn className="h-4 w-4 mr-2" />
          <span>Sign In</span>
        </Button>
      </Link>
    )
  }

  // Sanitize and format display information
  const rawDisplayName = user.profile?.username || user.profile?.full_name?.split(' ')[0] || 'User'
  const displayName = truncateText(rawDisplayName, MAX_DISPLAY_NAME_LENGTH)
  const fullName = user.profile?.full_name ? truncateText(user.profile.full_name, MAX_DISPLAY_NAME_LENGTH) : displayName
  const username = user.profile?.username ? truncateText(user.profile.username, MAX_USERNAME_LENGTH) : ''
  const avatarUrl = avatarError ? '' : (user.profile?.avatar_url || '')
  const initials = getInitials(rawDisplayName)

  const handleLogout = async () => {
    try {
      setIsOpen(false) // Close dropdown before signing out
      await signOut()
      // Instead of refresh, directly navigate to auth page
      router.push('/auth')
    } catch (error) {
      console.error('Error during logout:', error)
      toast.error('Failed to log out', {
        description: 'Please try again.',
        className: "dark:bg-zinc-800 dark:text-zinc-200",
        descriptionClassName: "dark:text-zinc-400"
      })
    }
  }

  const handleNotificationClick = () => {
    toast.info("Coming Soon!", {
      description: "Notifications are still under development and will be available soon! 🔔",
      duration: 4000,
      position: "top-center",
      className: "dark:bg-zinc-800 dark:text-zinc-200",
      descriptionClassName: "dark:text-zinc-400",
      icon: <Bell className="h-5 w-5" />,
      action: {
        label: "Dismiss",
        onClick: () => toast.dismiss()
      }
    })
  }

  // const handleSettingsClick = () => {
  //   toast.info("Coming Soon!", {
  //     description: "Settings panel is under development and will be available soon! ⚙️",
  //     duration: 4000,
  //     position: "top-center",
  //     className: "dark:bg-zinc-800 dark:text-zinc-200",
  //     descriptionClassName: "dark:text-zinc-400",
  //     icon: <Settings className="h-5 w-5" />,
  //     action: {
  //       label: "Dismiss",
  //       onClick: () => toast.dismiss()
  //     }
  //   })
  // }

  return (
    <div className="relative flex items-center space-x-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-10 w-10 rounded-full p-0 hover:bg-muted/50 transition-colors"
              aria-label="Notifications"
              onClick={handleNotificationClick}
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/10 ring-2 ring-background flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-primary/30 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notifications (Coming Soon)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              className={cn(
                "relative h-10 rounded-full pl-2 pr-4",
                "max-w-[200px] truncate" // Prevent overflow on very wide screens
              )}
            >
              <Avatar className="h-8 w-8 mr-2 shrink-0">
                <AvatarImage 
                  src={avatarUrl} 
                  alt={displayName}
                  onError={() => setAvatarError(true)}
                />
                <AvatarFallback delayMs={600}>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block font-medium text-sm truncate">
                {displayName}
              </span>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 p-2" 
          align="end" 
          forceMount
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal p-4">
            <div className="flex flex-col space-y-1">
              <p className="text-lg font-semibold leading-none break-words">
                {fullName}
              </p>
              {username && (
                <p className="text-sm leading-none text-muted-foreground break-words">
                  @{username}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Link href="/profile">
            <DropdownMenuItem className="p-3 cursor-pointer">
              <User className="mr-3 h-5 w-5 shrink-0" />
              <span className="font-medium">Profile</span>
            </DropdownMenuItem>
          </Link>
          {/* <DropdownMenuItem className="p-3 cursor-pointer" onClick={handleSettingsClick}>
            <Settings className="mr-3 h-5 w-5 shrink-0" />
            <span className="font-medium">Settings</span>
          </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="p-3 cursor-pointer text-red-500 focus:text-red-500" 
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0" />
            <span className="font-medium">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
