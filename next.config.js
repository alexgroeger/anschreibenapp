/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // ESLint wird während des Builds ausgeführt, aber wir haben eine eigene Konfiguration
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig

