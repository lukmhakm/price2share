import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Price2Share',
    short_name: 'P2S',
    description: 'Kalkulator dan histori harga share cosmetic',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f7f5',
    theme_color: '#1b4332',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
