import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * TypeScript 7 dropped the internal compiler API that Next.js used to
     * call directly. This tells Next to shell out to the `tsc` CLI instead.
     * Remove this line if you ever downgrade to TypeScript 6.
     */
    useTypeScriptCli: true,
  },
  images: {
    /**
     * Audius artwork is served from many different content nodes
     * (figment.io, theblueprint.xyz, open-audio-validator.com, and more),
     * and the hostname changes per track. We cannot list them all, so we
     * allow any https host for images.
     */
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
