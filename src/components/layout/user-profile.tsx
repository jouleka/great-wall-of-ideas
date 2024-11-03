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
import { User, LogOut, Settings, LogIn, Bell } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/utils"
import { getInitials } from "@/lib/utils/string-utils"

const MAX_DISPLAY_NAME_LENGTH = 20
const MAX_USERNAME_LENGTH = 25

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut, isLoading } = useAuth()
  const [avatarError, setAvatarError] = useState(false)

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

  return (
    <div className="relative flex items-center space-x-4">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full p-0"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
      </motion.div>
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
              <span className="font-medium text-sm truncate">
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
          <DropdownMenuItem className="p-3 cursor-pointer">
            <Settings className="mr-3 h-5 w-5 shrink-0" />
            <span className="font-medium">Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="p-3 cursor-pointer text-red-500 focus:text-red-500" 
            onClick={() => {
              setIsOpen(false) // Close dropdown before signing out
              signOut()
            }}
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0" />
            <span className="font-medium">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
