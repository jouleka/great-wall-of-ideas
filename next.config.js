/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev server access from localhost (CVE-2025-48068 mitigation)
  allowedDevOrigins: ['http://localhost:3000'],
  
  // Optimize package imports to reduce bundle size and build time
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'framer-motion',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-character-count',
      'date-fns',
    ],
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.com').replace('https://', ''),
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Reduce build output and disable source maps in production for faster builds
  productionBrowserSourceMaps: false,
  
  // Skip TypeScript errors during build (type checking done separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Skip ESLint during build (linting done separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
