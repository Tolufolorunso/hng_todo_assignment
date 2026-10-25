import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaskFlow",
    short_name: "TaskFlow",
    description:
      "A single-user, offline-capable task and notes app with no sign-up and no server; all data lives in the browser.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Quick Capture",
        short_name: "Capture",
        description: "Quickly capture text or links to your offline inbox",
        url: "/inbox?capture=true",
        icons: [{ src: "/icon.svg", sizes: "96x96" }],
      },
      {
        name: "Inbox",
        short_name: "Inbox",
        description: "Open your offline capture inbox",
        url: "/inbox",
        icons: [{ src: "/icon.svg", sizes: "96x96" }],
      },
    ],
    share_target: {
      action: "/inbox",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
