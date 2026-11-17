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

  // The wall at /ideas is the home page. Send "/" there with a real HTTP 308
  // (the page-level redirect in app/page.tsx is prerendered as a 200 HTML
  // shell, which crawlers that don't run JavaScript can't follow).
  async redirects() {
    return [{ source: '/', destination: '/ideas', permanent: true }]
  },

  // Reduce build output and disable source maps in production for faster builds
  productionBrowserSourceMaps: false,
  
  // Skip TypeScript errors during build (type checking done separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  
}

module.exports = nextConfig
