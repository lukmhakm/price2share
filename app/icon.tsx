import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: '120px',
          border: '16px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <span
          style={{
            fontSize: '190px',
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
