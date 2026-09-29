/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Helps avoid double WebRTC peer connections in development
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  }
};

module.exports = nextConfig;
