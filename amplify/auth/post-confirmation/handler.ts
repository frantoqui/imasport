import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient();

/**
 * Every confirmed sign-up lands in ATHLETES. Elevating someone to COACHES or
 * ADMINS is an explicit admin action (see the `user-admin` function), so a
 * self-service sign-up can never grant itself privileges.
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  await client.send(
    new AdminAddUserToGroupCommand({
      GroupName: "ATHLETES",
      Username: event.userName,
      UserPoolId: event.userPoolId,
    })
  );

  return event;
};
