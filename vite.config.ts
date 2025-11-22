import { defineConfig } from "npm:vite@7";

// Use a relative base so the built site works when served from GitHub Pages
// (project pages) or from the filesystem. If you prefer absolute URLs
// set `base: '/your-repo-name/'` instead.
export default defineConfig({
  base: "./",
});
