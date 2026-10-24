import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok-free.dev"],
  // The Quarterly Report became the Snapshot Report when updates moved to three periods a year;
  // keep old bookmarks and shared links working. Runs before proxy.ts, which then gates the new path.
  async redirects() {
    return [
      {
        source: "/vg-leader-portal/quarterly-report/:path*",
        destination: "/vg-leader-portal/snapshot-report/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
