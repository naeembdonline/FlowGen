/** @type {import('next').NextConfig} */
const nextConfig = {
  // =================================================================
  // ENVIRONMENT VARIABLES
  // =================================================================
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // =================================================================
  // REACT CONFIGURATION
  // =================================================================
  reactStrictMode: true,

  // =================================================================
  // IMAGE OPTIMIZATION
  // =================================================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
    ],
  },

  // =================================================================
  // WEBPACK CONFIGURATION
  // =================================================================
  webpack: (config, { isServer }) => {
    // Fix for canvas module (if using charts/graphics)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // =================================================================
  // EXPERIMENTAL FEATURES (Next.js 15 Compatible)
  // =================================================================
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // =================================================================
  // LOGGING CONFIGURATION
  // =================================================================
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // =================================================================
  // OUTPUT CONFIGURATION
  // =================================================================
  output: 'standalone',

  // =================================================================
  // TYPESCRIPT CONFIGURATION
  // =================================================================
  typescript: {
    ignoreBuildErrors: false,
  },

  // =================================================================
  // ESLINT CONFIGURATION
  // =================================================================
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
