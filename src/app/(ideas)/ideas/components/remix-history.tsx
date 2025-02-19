import { useEffect } from 'react'
import { useRemixStore } from '@/lib/store/use-remix-store'
import { useAuth } from '@/hooks/use-auth'
import { RemixNode } from '@/lib/types/idea'
import { cn } from '@/lib/utils/utils'
import { GitFork, User } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface RemixHistoryProps {
  ideaId: string
  className?: string
}

const RemixNodeComponent = ({ node, isLast = false }: { node: RemixNode, isLast?: boolean }) => {
  const router = useRouter()

  return (
    <div className="relative">
      <div className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg transition-colors",
        "hover:bg-accent/50 cursor-pointer group",
        "border border-border/40"
      )}
      onClick={() => router.push(`/ideas?id=${node.id}`)}
      >
        {/* Connection Lines */}
        {!node.is_original && (
          <div className="absolute left-[-24px] top-1/2 w-6 h-px bg-border" />
        )}
        {!isLast && node.children && node.children.length > 0 && (
          <div className="absolute left-6 top-[calc(100%+1px)] w-px h-6 bg-border" />
        )}
        
        {/* Node Content */}
        <div className={cn(
          "shrink-0 rounded-full p-2",
          node.is_original ? "bg-primary/10" : "bg-accent"
        )}>
          <GitFork className={cn(
            "w-4 h-4",
            node.is_original ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm group-hover:text-primary truncate">
            {node.title}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{node.author_name}</span>
            </div>
            <span>•</span>
            <span>{format(new Date(node.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="pl-12 mt-6 space-y-6">
          {node.children.map((child, index) => (
            <RemixNodeComponent 
              key={child.id} 
              node={child} 
              isLast={index === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RemixHistory({ ideaId, className }: RemixHistoryProps) {
  const { remixHistory, getRemixHistory, isLoading, reset } = useRemixStore()
  const { user } = useAuth()

  useEffect(() => {
    const fetchHistory = async () => {
      reset()
      await getRemixHistory(ideaId)
    }
    fetchHistory()

    return () => {
      reset()
    }
  }, [ideaId, user?.id, getRemixHistory, reset])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Loading remix history...
      </div>
    )
  }

  if (remixHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4 sm:p-8 text-center">
        <div className="rounded-full bg-primary/10 p-3 sm:p-4">
          <GitFork className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-base sm:text-lg">No Remix History</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-[250px] sm:max-w-sm">
            This idea hasn&apos;t been remixed yet. Be the first to create a remix and start a new branch of innovation!
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className={cn("h-full w-full", className)}>
      <div className="space-y-4">
        {remixHistory.map((node, index) => (
          <RemixNodeComponent 
            key={node.id} 
            node={node}
            isLast={index === remixHistory.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  )
} 