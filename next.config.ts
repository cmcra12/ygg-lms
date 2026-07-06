import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  // The .docx templates are read from disk at runtime — make sure they ship
  // with the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./templates/**"],
  },
};

export default nextConfig;
