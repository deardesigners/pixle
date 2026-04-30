/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'assets.meshy.ai' }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: '8mb' }
  }
};

export default nextConfig;
