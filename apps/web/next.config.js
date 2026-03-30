import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 모노레포 루트 — 서버리스 번들에 workspace 패키지(Prisma 등) 추적용 */
const monorepoRoot = path.join(__dirname, '../..');
/** Next 기본은 apps/web만 .env 로드 — 루트 `.env`의 NEXT_PUBLIC_* 등 서버 전역에 반영 (pnpm은 @next/env 직접 해석 불가) */
dotenv.config({ path: path.join(monorepoRoot, '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/db', '@repo/email', '@repo/pdf'],
  experimental: {
    outputFileTracingRoot: monorepoRoot,
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
      config.externals.push({
        'puppeteer-core': 'commonjs puppeteer-core',
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
      });
    }
    return config;
  },
};

export default nextConfig;
