import { defineAuth } from "@aws-amplify/backend";
import { postConfirmation } from "./post-confirmation/resource.js";
import { userAdmin } from "../functions/user-admin/resource.js";

/**
 * Cognito user pool for IMASPORT.
 *
 * Roles are Cognito groups, in precedence order. Group membership is the single
 * source of truth for authorization: the AppSync rules in `data/resource.ts`
 * and the S3 rules in `storage/resource.ts` both read from it.
 *
 * - ADMINS   full control of events, photos, plans, site content and users
 * - COACHES  evaluate athletes, upload athlete photos, read athlete progress
 * - ATHLETES default for every new sign-up; owns their own data
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Verifica tu cuenta IMASPORT",
      verificationEmailBody: (createCode) =>
        `Bienvenido a IMASPORT. Tu código de verificación es ${createCode()}`,
    },
  },
  userAttributes: {
    fullname: { required: false, mutable: true },
    phoneNumber: { required: false, mutable: true },
  },
  groups: ["ADMINS", "COACHES", "ATHLETES"],
  accountRecovery: "EMAIL_ONLY",
  triggers: {
    postConfirmation,
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
    allow.resource(userAdmin).to([
      "addUserToGroup",
      "removeUserFromGroup",
      "listUsers",
      "listUsersInGroup",
      "listGroupsForUser",
      "getUser",
      "disableUser",
      "enableUser",
      "updateUserAttributes",
      // Coaches do not sign themselves up: an administrator creates the
      // account outright and hands over the initial password.
      "createUser",
      "setUserPassword",
    ]),
  ],
});
