import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

const REFRESH_INTERVAL = 4 * 60 * 1000
const SESSION_TIMEOUT = 5 * 60 * 1000

export const sessionUtils = {
  lastActivity: Date.now(),
  refreshTimer: null as NodeJS.Timeout | null,

  startSessionRefresh() {
    this.updateLastActivity()
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    this.refreshTimer = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - this.lastActivity

      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        this.stopSessionRefresh()
        toast.error("Session expired. Please refresh the page.")
        return
      }

      try {
        const supabase = createClientComponentClient()
        const { error } = await supabase.auth.refreshSession()
        if (error) throw error
      } catch (error) {
        console.error('Error refreshing session:', error)
        this.stopSessionRefresh()
      }
    }, REFRESH_INTERVAL)
  },

  stopSessionRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  },

  updateLastActivity() {
    this.lastActivity = Date.now()
  }
} 