import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Discipleship Journey",
    short_name: "DJ Check-in",
    description: "Registration and check-in for Discipleship Journey",
    start_url: "/admin",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#00428E",
    icons: [
      {
        src: "/dj-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
