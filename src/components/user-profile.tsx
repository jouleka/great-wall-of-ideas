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
import { useAuth } from "@/app/auth/hooks/use-auth"
import { motion } from "framer-motion"

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()

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

  return (
    <div className="relative flex items-center space-x-4">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
      </motion.div>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button variant="ghost" className="relative h-10 rounded-full pl-2 pr-4">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.name || user.email} />
                <AvatarFallback>{(user.user_metadata?.name || user.email)?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{user.user_metadata?.name?.split(' ')[0] || user.email?.split('@')[0]}</span>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
          <DropdownMenuLabel className="font-normal p-4">
            <div className="flex flex-col space-y-1">
              <p className="text-lg font-semibold leading-none">{user.user_metadata?.name || user.email}</p>
              <p className="text-sm leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-3 cursor-pointer">
            <User className="mr-3 h-5 w-5" />
            <span className="font-medium">Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="p-3 cursor-pointer">
            <Settings className="mr-3 h-5 w-5" />
            <span className="font-medium">Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-3 cursor-pointer text-red-500 focus:text-red-500" onClick={signOut}>
            <LogOut className="mr-3 h-5 w-5" />
            <span className="font-medium">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}