/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only use standalone output in production to avoid module resolution issues in development
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  eslint: {
    // ESLint wird während des Builds ausgeführt, aber wir haben eine eigene Konfiguration
    // Temporarily ignore ESLint errors during build due to config incompatibility
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Image optimization configuration
  images: {
    formats: ['image/avif', 'image/webp'],
    // Enable image optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum quality for optimized images
    minimumCacheTTL: 60,
    // Allow external images if needed (configure domains in production)
    remotePatterns: process.env.NODE_ENV === 'production' ? [] : [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle pdfjs-dist worker files
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Disable worker for server-side rendering
        'pdfjs-dist/build/pdf.worker.mjs': false,
        'pdfjs-dist/build/pdf.worker.js': false,
        'pdfjs-dist/legacy/build/pdf.worker.mjs': false,
        'pdfjs-dist/legacy/build/pdf.worker.js': false,
        // Also disable any worker imports
        'pdf.worker.mjs': false,
        'pdf.worker.js': false,
      };
      
      // Ensure pdfjs-dist and mammoth are bundled (not externalized)
      // This is important for standalone output
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          (context, request, callback) => {
            // Don't externalize pdfjs-dist or mammoth
            if (request === 'pdfjs-dist' || request === 'mammoth') {
              return callback();
            }
            return originalExternals(context, request, callback);
          }
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          (external) => external !== 'pdfjs-dist' && external !== 'mammoth'
        );
      }
    }
    return config;
  },
}

module.exports = nextConfig

