import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  // The .docx templates are read from disk at runtime — make sure they ship
  // with the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./templates/**"],
  },
  async redirects() {
    // Loans were renamed to Accounts; keep old links working.
    return [
      { source: "/loans", destination: "/accounts", permanent: true },
      { source: "/loans/:id", destination: "/accounts/:id", permanent: true },
    ];
  },
};

export default nextConfig;
