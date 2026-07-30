// @ts-nocheck
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // 빌드 시 TypeScript 타입 에러가 있어도 배포를 강제 진행합니다.
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 시 ESLint 검사 에러가 있어도 배포를 진행합니다.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;