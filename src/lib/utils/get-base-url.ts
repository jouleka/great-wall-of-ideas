export const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.com'
} 