/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yugo/app-core', '@yugo/shared', '@yugo/ui-tokens'],
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apple exige JSON sin extensión en esta ruta para los universal links.
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

export default nextConfig;
