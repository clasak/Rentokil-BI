/** @type {import('next').NextConfig} */

// Content Security Policy directives
// Kept as an array for readability, joined into a single string below.
const cspDirectives = [
  // Default: only allow same-origin resources
  "default-src 'self'",

  // Scripts: self + inline/eval needed by Next.js dev mode and Recharts
  // In production, Next.js still requires 'unsafe-inline' for its bootstrap scripts.
  // 'unsafe-eval' is needed for Next.js hot-reload in development; harmless in prod
  // as Webpack/Turbopack compiled code no longer relies on eval.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",

  // Styles: self + unsafe-inline required by Radix UI and Tailwind runtime injection
  "style-src 'self' 'unsafe-inline'",

  // Images: self + data URIs (Recharts SVG, base64 icons) + Google profile pics + Mapbox tiles
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.tiles.mapbox.com https://api.mapbox.com",

  // Fonts: self (local fonts only)
  "font-src 'self' data:",

  // API connections: self (internal /api routes) + Supabase + Mapbox + Vercel analytics
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",

  // Web workers: self + blob (Mapbox GL uses blob workers)
  "worker-src 'self' blob:",

  // Child/frame sources: none - this app does not embed iframes
  "frame-src 'none'",

  // Object/embed: none - no Flash/Java/plugins
  "object-src 'none'",

  // Base URI: self only - prevent base tag hijacking
  "base-uri 'self'",

  // Form actions: self only - forms submit to same origin
  "form-action 'self'",

  // Prevent this site from being framed (supplement to X-Frame-Options)
  "frame-ancestors 'none'",
]

const ContentSecurityPolicy = cspDirectives.join('; ')

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Redirect old sales tracker routes to consolidated page
      {
        source: '/ae/tracker/proposals',
        destination: '/ae/tracker',
        permanent: true,
      },
      {
        source: '/ae/tracker/sales',
        destination: '/ae/tracker',
        permanent: true,
      },
      {
        source: '/ae/tracker/totals',
        destination: '/ae/tracker',
        permanent: true,
      },
      // Redirect legacy routes to correct locations
      {
        source: '/data-quality',
        destination: '/governance/data-quality',
        permanent: true,
      },
      {
        source: '/command-center',
        destination: '/',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // --- Content Security Policy ---
          // Controls which resources the browser is allowed to load.
          // See cspDirectives array above for per-directive documentation.
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },

          // --- Prevent MIME-type sniffing ---
          // Stops browsers from interpreting files as a different MIME type
          // than what is specified in the Content-Type header, mitigating
          // drive-by download attacks.
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },

          // --- Clickjacking protection ---
          // Prevents the page from being rendered inside an iframe.
          // Redundant with CSP frame-ancestors but needed for older browsers.
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },

          // --- XSS filter (legacy browsers) ---
          // Enables the browser's built-in XSS filter. Modern browsers have
          // deprecated this in favor of CSP, but it provides defense-in-depth
          // for older clients.
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },

          // --- Referrer Policy ---
          // Sends origin-only referrer for cross-origin requests and full
          // referrer for same-origin. Prevents leaking internal dashboard
          // paths to external services (Mapbox, Supabase, etc.).
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          // --- Permissions Policy ---
          // Restricts access to browser features. Camera and microphone are
          // disabled entirely. Geolocation is allowed for self only (may be
          // needed for Mapbox user-location features on technician routes).
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },

          // --- Strict Transport Security ---
          // Instructs browsers to only access the site over HTTPS for the
          // next year. includeSubDomains covers all subdomains.
          // Only effective when served over HTTPS (ignored on localhost).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
