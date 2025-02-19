import { useEffect, useState, memo } from 'react'
import { useRemixStore } from '@/lib/store/use-remix-store'
import { RemixNode } from '@/lib/types/idea'
import { cn } from '@/lib/utils/utils'
import { GitFork, User, ChevronRight, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { RemixHistory } from './remix-history'

interface RemixTreeDialogProps {
  ideaId: string
  className?: string
}

// Mobile-optimized timeline view component
const MobileRemixNode = memo(({ node, hasPrivateParent = false }: { node: RemixNode, hasPrivateParent?: boolean }) => {
  const router = useRouter()
  const { user } = useAuth()

  // If parent is private and user doesn't own this idea, show private placeholder
  if (hasPrivateParent && (!user || user.id !== node.user_id)) {
    return (
      <div className="relative">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/30">
          <div className="relative flex flex-col items-center">
            <div className="shrink-0 rounded-full p-2 bg-muted text-muted-foreground">
              <Lock className="w-4 h-4" />
            </div>
            {node.children && node.children.length > 0 && (
              <div className="absolute top-[calc(100%+2px)] left-1/2 h-4 w-px -translate-x-1/2 bg-border" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Private Remix
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              This remix is private and not visible to you
            </p>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="pl-6 mt-4 space-y-4">
            {node.children.map((child) => (
              <MobileRemixNode 
                key={child.id} 
                node={child}
                hasPrivateParent={true}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg transition-all duration-200",
          "hover:bg-accent/50 active:bg-accent cursor-pointer",
          "border border-border/40",
          node.is_original && "bg-primary/5"
        )}
        onClick={() => router.push(`/ideas?id=${node.id}`)}
      >
        {/* Left Timeline */}
        <div className="relative flex flex-col items-center">
          <div className={cn(
            "shrink-0 rounded-full p-2",
            node.is_original 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            <GitFork className="w-4 h-4" />
          </div>
          {node.children && node.children.length > 0 && (
            <div className="absolute top-[calc(100%+2px)] left-1/2 h-4 w-px -translate-x-1/2 bg-border" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm leading-tight">
                {node.title}
              </h4>
              {node.is_original && (
                <span className="inline-block text-[10px] font-medium text-primary mt-1 bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Original
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
          </div>
          
          <div className="flex items-center gap-x-2 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{node.author_name}</span>
            </div>
            <span>•</span>
            <span>{format(new Date(node.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="pl-6 mt-4 space-y-4">
          {node.children.map((child) => (
            <MobileRemixNode 
              key={child.id} 
              node={child} 
              hasPrivateParent={node.is_private}
            />
          ))}
        </div>
      )}
    </div>
  )
})

MobileRemixNode.displayName = 'MobileRemixNode'

// Desktop tree view component
const DesktopRemixNode = memo(({ 
  node, 
  isLast = false,
  hasPrivateParent = false 
}: { 
  node: RemixNode, 
  isLast?: boolean,
  hasPrivateParent?: boolean
}) => {
  const router = useRouter()
  const { user } = useAuth()

  // If parent is private and user doesn't own this idea, show private placeholder
  if (hasPrivateParent && (!user || user.id !== node.user_id)) {
    return (
      <div className="relative">
        <div className={cn(
          "relative flex items-center gap-4 p-4 rounded-xl",
          "border border-border/40 bg-muted/30"
        )}>
          {/* Connection Lines */}
          {!node.is_original && (
            <>
              <div className="absolute left-[-40px] top-1/2 w-10 h-px bg-gradient-to-r from-border/0 via-border to-border" />
              <div className="absolute left-[-40px] top-[-30px] bottom-1/2 w-px bg-gradient-to-b from-border/0 to-border" />
            </>
          )}
          {!isLast && node.children && node.children.length > 0 && (
            <div className="absolute left-8 top-[calc(100%+2px)] w-px h-8 bg-gradient-to-b from-border to-border/0" />
          )}
          
          {/* Node Content */}
          <div className="shrink-0 rounded-full p-3 bg-muted text-muted-foreground">
            <Lock className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-muted-foreground">
              Private Remix
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              This remix is private and not visible to you
            </p>
          </div>
        </div>

        {/* Children */}
        {node.children && node.children.length > 0 && (
          <div className="pl-16 mt-8 space-y-8">
            {node.children.map((child, index) => (
              <DesktopRemixNode 
                key={child.id} 
                node={child} 
                isLast={index === node.children!.length - 1}
                hasPrivateParent={true}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
        "hover:bg-accent/50 cursor-pointer group",
        "border border-border/40 hover:border-primary/20",
        "hover:shadow-lg hover:shadow-primary/5"
      )}
      onClick={() => router.push(`/ideas?id=${node.id}`)}
      >
        {/* Connection Lines */}
        {!node.is_original && (
          <>
            <div className="absolute left-[-40px] top-1/2 w-10 h-px bg-gradient-to-r from-border/0 via-border to-border" />
            <div className="absolute left-[-40px] top-[-30px] bottom-1/2 w-px bg-gradient-to-b from-border/0 to-border" />
          </>
        )}
        {!isLast && node.children && node.children.length > 0 && (
          <div className="absolute left-8 top-[calc(100%+2px)] w-px h-8 bg-gradient-to-b from-border to-border/0" />
        )}
        
        {/* Node Content */}
        <div className={cn(
          "shrink-0 rounded-full p-3",
          node.is_original 
            ? "bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/10" 
            : "bg-gradient-to-br from-accent to-accent/50"
        )}>
          <GitFork className={cn(
            "w-5 h-5",
            node.is_original ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-base group-hover:text-primary truncate">
              {node.title}
            </h4>
            {node.is_original && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Original
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{node.author_name}</span>
            </div>
            <span>•</span>
            <span>{format(new Date(node.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="pl-16 mt-8 space-y-8">
          {node.children.map((child, index) => (
            <DesktopRemixNode 
              key={child.id} 
              node={child} 
              isLast={index === node.children!.length - 1}
              hasPrivateParent={node.is_private}
            />
          ))}
        </div>
      )}
    </div>
  )
})

DesktopRemixNode.displayName = 'DesktopRemixNode'

export function RemixTreeDialog({ ideaId, className }: RemixTreeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const { getRemixHistory, reset } = useRemixStore()

  useEffect(() => {
    if (isOpen) {
      const fetchHistory = async () => {
        reset()
        await getRemixHistory(ideaId)
      }
      fetchHistory()
    }
    
    return () => {
      reset()
    }
  }, [isOpen, ideaId, user?.id, getRemixHistory, reset])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(className)}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <GitFork className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                View Remix Tree
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] p-0 w-[calc(100vw-32px)] sm:w-[90vw] max-h-[calc(100vh-32px)] sm:max-h-[90vh]">
        <DialogHeader className="p-4 sm:p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <DialogTitle className="text-xl sm:text-2xl">Remix Tree</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            View the history and evolution of this idea through its remixes
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(100vh-200px)] sm:h-[600px]">
          <div className="p-4 sm:p-8">
            <RemixHistory ideaId={ideaId} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

RemixTreeDialog.displayName = 'RemixTreeDialog' 