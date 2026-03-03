const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // /os → /os/index.html (the static Vite build of BEC VORTEX OS)
  async rewrites() {
    return [
      {
        source: '/os',
        destination: '/os/index.html',
      },
    ];
  },
};

module.exports = nextConfig;
