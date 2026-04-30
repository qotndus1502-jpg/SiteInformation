import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker용 self-contained 번들 — .next/standalone 디렉토리가 생성된다.
  output: "standalone",
};

export default nextConfig;
