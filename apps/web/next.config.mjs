/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yugo/shared', '@yugo/ui-tokens'],
  reactStrictMode: true,
};

export default nextConfig;
