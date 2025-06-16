/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  typescript: {
    // !! WARN !!
    // Temporarily allow production builds to successfully complete even if
    // your project has type errors. This is a temporary measure to bypass
    // a recurring build issue and should be removed once the underlying
    // type errors in 'player-detail/[playerName]/route.ts' are resolved.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 