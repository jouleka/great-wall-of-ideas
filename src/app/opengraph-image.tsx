import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site'

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BRICK_ROWS = 6
const BRICKS_PER_ROW = 5

// Rendered once at build time (no request-time data), then served statically.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          color: '#fafafa',
          padding: '72px 80px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '40px 0 40px 40px',
            opacity: 0.22,
          }}
        >
          {Array.from({ length: BRICK_ROWS }).map((_, row) => (
            <div key={row} style={{ display: 'flex', gap: 10, marginLeft: row % 2 ? -45 : 0 }}>
              {Array.from({ length: BRICKS_PER_ROW }).map((__, col) => (
                <div
                  key={col}
                  style={{
                    width: 80,
                    height: 76,
                    borderRadius: 6,
                    background: (row + col) % 5 === 0 ? '#eab308' : '#3f3f46',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: '#eab308' }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: '#eab308' }} />
          greatwallofideas.com
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 38, lineHeight: 1.3, color: '#a1a1aa' }}>{SITE_TAGLINE}</div>
        </div>

        <div style={{ display: 'flex', gap: 28, fontSize: 28, color: '#d4d4d8' }}>
          <span>Publish</span>
          <span style={{ color: '#52525b' }}>·</span>
          <span>Discover</span>
          <span style={{ color: '#52525b' }}>·</span>
          <span>Discuss</span>
          <span style={{ color: '#52525b' }}>·</span>
          <span>Remix</span>
        </div>
      </div>
    ),
    size,
  )
}
