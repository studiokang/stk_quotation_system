/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/db', '@repo/email', '@repo/pdf'],
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        puppeteer: 'commonjs puppeteer',
        'puppeteer-core': 'commonjs puppeteer-core',
      });
    }
    return config;
  },
};

export default nextConfig;
