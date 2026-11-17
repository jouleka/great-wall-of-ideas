'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { TURNSTILE_SCRIPT_URL, TURNSTILE_SITE_KEY } from '@/lib/config/turnstile'
import { cn } from '@/lib/utils/utils'

interface TurnstileRenderOptions {
  sitekey: string
  action?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'flexible' | 'compact'
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
  'error-callback'?: (errorCode: string) => boolean | void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.turnstile) {
        resolve(window.turnstile)
      } else {
        reject(new Error('Turnstile failed to initialise'))
      }
    }
    script.onerror = () => reject(new Error('Turnstile script failed to load'))
    document.head.appendChild(script)
  }).catch((error) => {
    // Allow a later mount to retry loading the script.
    scriptPromise = null
    throw error
  })

  return scriptPromise
}

export interface TurnstileWidgetHandle {
  /** Discard the current token and fetch a fresh one (tokens are single-use). */
  reset: () => void
}

interface TurnstileWidgetProps {
  /** Receives a fresh token, or null when the token expires, errors, or is reset. */
  onTokenChange: (token: string | null) => void
  action?: string
  className?: string
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onTokenChange, action, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const onTokenChangeRef = useRef(onTokenChange)
    const [loadError, setLoadError] = useState<string | null>(null)
    const { resolvedTheme } = useTheme()
    const theme = resolvedTheme === 'dark' ? 'dark' : resolvedTheme === 'light' ? 'light' : 'auto'

    useEffect(() => {
      onTokenChangeRef.current = onTokenChange
    }, [onTokenChange])

    useImperativeHandle(ref, () => ({
      reset() {
        onTokenChangeRef.current(null)
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }), [])

    useEffect(() => {
      let cancelled = false

      loadTurnstile()
        .then((turnstile) => {
          if (cancelled || !containerRef.current) return
          setLoadError(null)
          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action,
            theme,
            size: 'flexible',
            callback: (token) => {
              setLoadError(null)
              onTokenChangeRef.current(token)
            },
            'expired-callback': () => onTokenChangeRef.current(null),
            'timeout-callback': () => onTokenChangeRef.current(null),
            'error-callback': () => {
              onTokenChangeRef.current(null)
              setLoadError('The security check could not be completed. Please try again or refresh the page.')
              // Returning true marks the error as handled; Turnstile retries on its own.
              return true
            },
          }) ?? null
        })
        .catch(() => {
          if (cancelled) return
          onTokenChangeRef.current(null)
          setLoadError('The security check could not be loaded. Check your connection or disable blockers for challenges.cloudflare.com, then refresh.')
        })

      return () => {
        cancelled = true
        onTokenChangeRef.current(null)
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current)
        }
        widgetIdRef.current = null
      }
    }, [action, theme])

    return (
      <div className={cn('space-y-2', className)}>
        <div ref={containerRef} className="min-h-[65px] w-full" />
        {loadError && (
          <p role="alert" className="text-sm text-red-500">
            {loadError}
          </p>
        )}
      </div>
    )
  }
)
