/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking (allow self for build preview)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Control referrer info
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy — allow microphone for voice recording
          {
            key: "Permissions-Policy",
            value:
              "camera=(), geolocation=(), interest-cohort=(), microphone=(self)",
          },
          // Strict Transport Security (HTTPS only)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
              "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://accounts.google.com https://pyawkyi.phyozinko.com",
              "frame-src 'self' blob: https://*.supabase.co https://accounts.google.com",
              "frame-ancestors 'self'",
              "media-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
