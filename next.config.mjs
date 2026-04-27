/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    after: true,
  },
  // ✅ FIX: @react-pdf/renderer precisa estar como external package
  // pra funcionar de forma estável em Server Components / API Routes do App Router
  serverExternalPackages: ['@react-pdf/renderer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
