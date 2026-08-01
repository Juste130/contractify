import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    // Stub optional Privy sub-dependencies we don't use
    // (@stripe/crypto for fiat onramp, @solana/* for Farcaster Solana)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stripe/crypto": path.resolve(
        __dirname,
        "src/lib/stubs/empty-module.js"
      ),
      "@solana/wallet-adapter-react": path.resolve(
        __dirname,
        "src/lib/stubs/empty-module.js"
      ),
      "@farcaster/mini-app-solana": path.resolve(
        __dirname,
        "src/lib/stubs/empty-module.js"
      ),
    };
    return config;
  },
};

export default nextConfig;
