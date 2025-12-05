import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Enable minification for smaller worker bundles
  minify: true,
});
