import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { reportService, ReportReason } from '@/lib/services/report-service'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface BaseReportDialogProps {
  onReportSubmitted?: () => void
  className?: string
  size?: 'default' | 'sm'
  showOnHover?: boolean
}

interface CommentReportDialogProps extends BaseReportDialogProps {
  type: 'comment'
  commentId: string
}

interface IdeaReportDialogProps extends BaseReportDialogProps {
  type: 'idea'
  ideaId: string
}

type ReportDialogProps = CommentReportDialogProps | IdeaReportDialogProps

export function ReportDialog({ onReportSubmitted, className, size = 'default', showOnHover = false, ...props }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const reportData = props.type === 'comment'
        ? { type: 'comment' as const, commentId: props.commentId, reason, notes: notes.trim() || undefined }
        : { type: 'idea' as const, ideaId: props.ideaId, reason, notes: notes.trim() || undefined }

      const { success } = await reportService.reportItem(reportData)

      if (success) {
        setIsOpen(false)
        onReportSubmitted?.()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleValueChange = (value: string) => {
    if (value === 'spam' || value === 'harassment' || value === 'inappropriate' || value === 'other') {
      setReason(value)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            size === 'default' ? 'h-8 w-8' : 'h-6 w-6',
            showOnHover ? 'sm:opacity-0 sm:group-hover:opacity-100 transition-opacity' : '',
            'hover:bg-accent hover:text-accent-foreground',
            className
          )}
        >
          <Flag className={size === 'default' ? 'h-4 w-4' : 'h-3 w-3'} />
          <span className="sr-only">Report</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report {props.type === 'comment' ? 'Comment' : 'Idea'}</DialogTitle>
          <DialogDescription>
            Please select a reason for reporting this {props.type}. This will be reviewed by our moderators.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Select
              value={reason}
              onValueChange={handleValueChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Textarea
              placeholder="Additional details (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 