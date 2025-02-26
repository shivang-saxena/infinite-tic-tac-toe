import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mp3)$/,
      use: {
        loader: "file-loader",
        options: {
          name: "[name].[ext]",
          outputPath: "static/sounds/",
          publicPath: "/_next/static/sounds/",
        },
      },
    });
    return config;
  },
};

export default nextConfig;
