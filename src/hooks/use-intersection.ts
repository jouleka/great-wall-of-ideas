import { useState, useEffect } from 'react'

export function useIntersection(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = { threshold: 0.5 }
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [elementRef, options])

  return isIntersecting
} 