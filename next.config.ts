import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Google OAuth profile images
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Supabase Storage (user uploaded avatars)
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
