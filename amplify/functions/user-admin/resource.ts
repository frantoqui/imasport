import { defineFunction } from "@aws-amplify/backend";

/**
 * Backs the admin-only custom mutations in `data/resource.ts`. It is the only
 * place in the backend allowed to change a user's Cognito group, so every
 * privilege change goes through an ADMINS-authorized AppSync field.
 */
export const userAdmin = defineFunction({
  name: "user-admin",
  entry: "./handler.ts",
  timeoutSeconds: 30,
});
