/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['undici'],
  experimental: {
    serverComponentsExternalPackages: ['undici'],
  },
}

module.exports = nextConfig
