/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only use standalone output in production to avoid module resolution issues in development
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  eslint: {
    // ESLint wird während des Builds ausgeführt, aber wir haben eine eigene Konfiguration
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Handle pdfjs-dist worker files
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Disable worker for server-side rendering
        'pdfjs-dist/build/pdf.worker.mjs': false,
        'pdfjs-dist/build/pdf.worker.js': false,
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

