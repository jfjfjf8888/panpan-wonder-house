import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产用 `next start` + 完整 node_modules 部署，不用 standalone。
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
