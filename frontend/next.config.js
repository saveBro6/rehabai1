const storagePublicPath = '/storage/v1/object/public/**';

const supabaseImagePatterns = [
  {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '54321',
    pathname: storagePublicPath,
  },
  {
    protocol: 'https',
    hostname: '**.supabase.co',
    pathname: storagePublicPath,
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (supabaseUrl) {
  try {
    const parsedSupabaseUrl = new URL(supabaseUrl);
    const derivedPattern = {
      protocol: parsedSupabaseUrl.protocol.replace(':', ''),
      hostname: parsedSupabaseUrl.hostname,
      pathname: storagePublicPath,
    };

    if (parsedSupabaseUrl.port) {
      derivedPattern.port = parsedSupabaseUrl.port;
    }

    if (
      !supabaseImagePatterns.some(
        (pattern) =>
          pattern.protocol === derivedPattern.protocol &&
          pattern.hostname === derivedPattern.hostname &&
          pattern.port === derivedPattern.port
      )
    ) {
      supabaseImagePatterns.push(derivedPattern);
    }
  } catch {
    // Ignore invalid local env values; runtime image URLs still fall back in getImageUrl().
  }
}

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
    remotePatterns: supabaseImagePatterns,
  },
};

module.exports = nextConfig;
