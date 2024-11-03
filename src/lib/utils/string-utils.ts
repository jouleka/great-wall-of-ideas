export function getInitials(name: string) {
  // Handle empty strings, numbers, or special characters
  if (!name || typeof name !== 'string') return '?'
  
  // Get first character of each word, max 2 characters
  const initials = name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0))
    .filter(char => char.match(/[A-Za-z]/)) // Only use letters
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return initials || '?'
}
