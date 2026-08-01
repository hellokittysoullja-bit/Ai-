/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Запрет угадывания MIME-типов браузером
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer только на свой origin для внешних переходов
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Принудительный HTTPS на 2 года (прод на Vercel всегда HTTPS)
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          // Приложение содержит личные данные — не даём встраивать в чужие iframe
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Отключаем ненужные API устройств
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
