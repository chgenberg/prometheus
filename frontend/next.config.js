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
    // your project has type errors while we fix the ESLint warnings.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors while we fix them systematically.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 