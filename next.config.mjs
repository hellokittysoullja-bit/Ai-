/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Базовые security-заголовки, которых не было вообще.
  // Permissions-Policy НАРОЧНО не глушит microphone: голосовой ввод
  // (hooks/use-dictation.ts, Web Speech API) — реальная, проверенная рендером
  // рабочая фича продукта, глухой запрет `microphone=()` сломал бы её молча.
  // camera/geolocation продукт не использует нигде — им можно быть строгими.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
