import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: 'sans-serif',
            letterSpacing: '-0.05em',
          }}
        >
          P2S
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
