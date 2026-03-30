import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 모노레포 루트 — 서버리스 번들에 workspace 패키지(Prisma 등) 추적용 */
const monorepoRoot = path.join(__dirname, '../..');
/** 로컬 개발만 루트 `.env` 로드 — Vercel 프로덕션 빌드에는 파일이 없으므로 생략 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(monorepoRoot, '.env') });
}

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
