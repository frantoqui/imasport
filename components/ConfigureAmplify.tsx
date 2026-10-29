"use client";

import "@/lib/amplify-client";

/**
 * Importing `lib/amplify-client` for its side effect is what configures
 * Amplify in the browser. Rendering this once in the root layout guarantees
 * that happens before any page runs an auth or data call.
 */
export function ConfigureAmplify() {
  return null;
}
