import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // 빌드 시 TypeScript 타입 에러가 있어도 배포를 강제 진행합니다.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
