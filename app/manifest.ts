import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Напарник',
    short_name: 'Напарник',
    description:
      'Существо, которое помогает начинать. Пишет первым, дробит шаги, растит остров из твоих стартов.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#1a1d17',
    theme_color: '#1a1d17',
    icons: [
      {
        src: '/images/app-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/app-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  }
}
