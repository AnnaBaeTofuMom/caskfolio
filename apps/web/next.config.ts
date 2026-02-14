import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*'
      }
    ];
  },
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
