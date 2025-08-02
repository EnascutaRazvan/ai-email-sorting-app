/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracing: true,
    outputFileTracingIncludes: {
      // Include only the necessary node_modules for your function(s)
      // e.g. only include playwright and supabase packages that are used
      // You may need to experiment with paths to exclude heavy unused deps
      // Here's an example:
      "node_modules/playwright": true,
      "node_modules/@supabase": true,
    },
  },
  // You can disable source maps or other build extras here as well if not needed
};

module.exports = nextConfig;
