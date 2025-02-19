"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { User, LogOut, LogIn, Bell, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/utils"
import { getInitials } from "@/lib/utils/string-utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useNotifications } from "@/hooks/use-notifications"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { useNotificationsStore } from '@/lib/store/use-notifications-store'
import { type Notification } from "@/lib/types/notification"

const MAX_DISPLAY_NAME_LENGTH = 20
const MAX_USERNAME_LENGTH = 25

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { user, signOut, isLoading } = useAuth()
  const [avatarError, setAvatarError] = useState(false)
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const shownNotificationsRef = useRef<Set<string>>(new Set())

  const handleNotificationClick = useCallback(async (notificationId: string, link?: string) => {
    await markAsRead([notificationId])
    
    if (link) {
      router.push(link)
    }
    setIsNotificationsOpen(false)
  }, [markAsRead, router])

  const handleNewNotification = useCallback((notification: Notification) => {
    // Only show toast if:
    // 1. We haven't shown it before in this session
    // 2. The notification is unread
    if (!shownNotificationsRef.current.has(notification.id) && !notification.read_at) {
      shownNotificationsRef.current.add(notification.id)
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
              label: 'View',
              onClick: () => handleNotificationClick(notification.id, notification.link),
            }
          : undefined,
      })
    }
  }, [handleNotificationClick])

  useEffect(() => {
    if (!user) {
      shownNotificationsRef.current.clear()
      return
    }

    const showInitialNotifications = () => {
      const unreadNotifications = notifications.filter(n => !n.read_at && !shownNotificationsRef.current.has(n.id))
      
      if (unreadNotifications.length > 0) {
        if (unreadNotifications.length === 1) {
          handleNewNotification(unreadNotifications[0])
        } else {
          // Show a summary toast for multiple notifications
          toast(
            <div className="space-y-2">
              <div className="font-medium">
                You have {unreadNotifications.length} unread notifications
              </div>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {unreadNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className="text-sm border-l-2 border-primary pl-2 py-1 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => {
                      handleNotificationClick(notification.id, notification.link)
                      toast.dismiss()
                    }}
                  >
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-muted-foreground text-xs">{notification.message}</div>
                  </div>
                ))}
              </div>
            </div>,
            {
              duration: 10000,
              action: {
                label: 'View All',
                onClick: () => {
                  setIsNotificationsOpen(true)
                  toast.dismiss()
                }
              },
            }
          )
          unreadNotifications.forEach(n => shownNotificationsRef.current.add(n.id))
        }
      }
    }

    const timeoutId = setTimeout(showInitialNotifications, 1000)

    const subscription = useNotificationsStore.subscribe((state) => {
      const latestNotification = state.notifications[0]
      const prevLatestNotification = notifications[0]

      if (latestNotification && 
          (!prevLatestNotification || latestNotification.id !== prevLatestNotification.id) && 
          !latestNotification.read_at) {
        handleNewNotification(latestNotification)
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription()
    }
  }, [user, notifications, handleNewNotification, setIsNotificationsOpen])

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

  const rawDisplayName = user.profile?.username || user.profile?.full_name?.split(' ')[0] || 'User'
  const displayName = truncateText(rawDisplayName, MAX_DISPLAY_NAME_LENGTH)
  const fullName = user.profile?.full_name ? truncateText(user.profile.full_name, MAX_DISPLAY_NAME_LENGTH) : displayName
  const username = user.profile?.username ? truncateText(user.profile.username, MAX_USERNAME_LENGTH) : ''
  const avatarUrl = avatarError ? '' : (user.profile?.avatar_url || '')
  const initials = getInitials(rawDisplayName)

  const handleLogout = async () => {
    try {
      setIsOpen(false)
      await signOut()
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

  return (
    <div className="relative flex items-center space-x-4">
      <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-10 w-10 rounded-full p-0 hover:bg-muted/50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-80 p-2" 
          align="end" 
          forceMount
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {unreadCount} unread
                  </span>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-muted"
                    onClick={markAllAsRead}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center px-4">
                <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
                <p className="text-xs text-muted-foreground/75 mt-1">
                  We&apos;ll notify you when something happens
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                  className={cn(
                    "relative w-full text-left px-2 py-3 space-y-1.5",
                    "hover:bg-muted/50 transition-colors rounded-md",
                    "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    !notification.read_at && "bg-primary/[0.04]"
                  )}
                >
                  {!notification.read_at && (
                    <span className="absolute right-2 top-3 h-2 w-2 rounded-full bg-primary" />
                  )}
                  
                  <div className="flex items-start justify-between gap-2 pr-4">
                    <p className={cn(
                      "text-sm font-medium leading-none",
                      !notification.read_at ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs line-clamp-2",
                    !notification.read_at ? "text-foreground/80" : "text-muted-foreground"
                  )}>
                    {notification.message}
                  </p>
                  
                  {notification.link && (
                    <div className={cn(
                      "flex items-center gap-1 mt-1",
                      !notification.read_at ? "text-primary" : "text-primary/60"
                    )}>
                      <span className="text-xs">View details</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

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
