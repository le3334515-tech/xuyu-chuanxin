import type { NextConfig } from "next";

/**
 * 全静态导出：没有服务端依赖，可以直接放到任何静态托管上。
 * BASE_PATH 让站点在子目录（GitHub Pages 项目页）下也能正常取到图片与音频。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
