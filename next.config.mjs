/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
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
          // ═══════════════════════════════════════════
          // TRANSPORT SECURITY
          // ═══════════════════════════════════════════
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // ═══════════════════════════════════════════
          // ANTI-ATTACK HEADERS
          // ═══════════════════════════════════════════
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME type sniffing attacks
          { key: "X-Content-Type-Options", value: "nosniff" },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Prevent DNS prefetch leaks
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Prevent page from being loaded in IE compatibility mode
          { key: "X-UA-Compatible", value: "IE=edge" },
          // Control referrer information leakage
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Opt out of Google FLoC / Topics API tracking
          {
            key: "Permissions-Policy",
            value:
              "camera=(), geolocation=(), interest-cohort=(), browsing-topics=(), microphone=(self), payment=(), usb=(), bluetooth=(), serial=(), hid=()",
          },
          // Prevent cross-origin information leakage
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

          // ═══════════════════════════════════════════
          // CONTENT SECURITY POLICY (strict)
          // ═══════════════════════════════════════════
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
              "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://accounts.google.com https://pyawkyi.phyozinko.com",
              "frame-src 'self' blob: https://*.supabase.co https://accounts.google.com",
              "frame-ancestors 'self'",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.supabase.co https://accounts.google.com",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      // ═══════════════════════════════════════════
      // CACHE CONTROL: Static assets
      // ═══════════════════════════════════════════
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
