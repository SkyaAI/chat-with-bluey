import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chat with Bluey",
    short_name: "Bluey",
    description: "A friendly everyday helper for chats, reminders, and gentle games.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#175cd3",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
