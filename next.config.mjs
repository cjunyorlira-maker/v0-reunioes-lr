/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    after: true,  // Habilita after() para processamento async apos response
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
