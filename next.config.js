/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig
