import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Note on images: `@next/next/no-img-element` stays ENABLED so new code is
  // flagged, and the places that genuinely need a plain <img> carry their own
  // inline disable. `next/image` cannot serve our media, because
  // `/api/media/<key>` authorizes the viewer and answers 307 with a
  // short-lived presigned S3 URL: the optimizer will not follow a redirect to
  // a host outside `images.remotePatterns`, and caching a private athlete
  // photo for `minimumCacheTTL` behind an unauthenticated optimizer URL would
  // defeat the gateway's access check. See lib/media.ts.
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Amplify's build output: generated CDK/Lambda bundles, not our source.
    ".amplify/**",
    "amplify_outputs*.json",
  ]),
]);

export default eslintConfig;
