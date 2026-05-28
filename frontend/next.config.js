/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/api/chatbot',
        destination: '/patient/api/chatbot',
        permanent: false,
      },
      {
        source: '/:path(dashboard|appointments|cart|doctors|exercises|pricing|products|profile|progress|recovery-plan|register|reset-password)',
        destination: '/patient/:path',
        permanent: false,
      },
      {
        source: '/:path(doctors|exercises|products|recovery-plan)/:slug*',
        destination: '/patient/:path/:slug*',
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
