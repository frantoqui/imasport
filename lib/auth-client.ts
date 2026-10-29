"use client";

import {
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signOut as amplifySignOut,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
} from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { client } from "./amplify-client";
import { roleFromGroups, type AppRole } from "./roles";

/**
 * Amplify's auth APIs only run in the browser, so sign-up and sign-in happen
 * client side. Because `lib/amplify-client` configures Amplify with
 * `ssr: true`, the resulting tokens land in cookies and the server picks the
 * session up from there on the next request.
 */

export type Discipline = "CrossFit" | "Hyrox" | "Calistenia";
export type PlanTier = "basic" | "pro" | "elite";

/** Profile details collected by the sign-up form that Cognito does not store. */
export type PendingProfile = {
  name: string;
  phone?: string;
  discipline?: Discipline;
  planTier?: PlanTier;
  certifications?: string;
  yearsExperience?: number;
  specialty?: string;
  bio?: string;
};

const PENDING_KEY = "imasport-pending-profile";

/**
 * The profile row can only be written once the user holds a token, which is
 * after e-mail confirmation. We stash the extra form fields until then.
 */
function stashPendingProfile(data: PendingProfile) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(data));
  } catch {
    // Private browsing with storage disabled: we fall back to Cognito
    // attributes in ensureProfile, so this is not fatal.
  }
}

function readPendingProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingProfile) : null;
  } catch {
    return null;
  }
}

function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Cognito requires E.164. Mexican numbers are the common case here. */
export function toE164(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}

export type SignUpResult = { needsConfirmation: boolean };

export async function registerUser(input: {
  email: string;
  password: string;
  profile: PendingProfile;
}): Promise<SignUpResult> {
  const phone = toE164(input.profile.phone);

  const { nextStep } = await signUp({
    username: input.email,
    password: input.password,
    options: {
      userAttributes: {
        email: input.email,
        name: input.profile.name,
        ...(phone ? { phone_number: phone } : {}),
      },
    },
  });

  stashPendingProfile(input.profile);

  return {
    needsConfirmation: nextStep.signUpStep === "CONFIRM_SIGN_UP",
  };
}

export async function confirmRegistration(input: {
  email: string;
  code: string;
}) {
  const { nextStep } = await confirmSignUp({
    username: input.email,
    confirmationCode: input.code,
  });
  return { done: nextStep.signUpStep === "DONE" };
}

export async function resendCode(email: string) {
  await resendSignUpCode({ username: email });
}

export type LoginResult =
  | { status: "signedIn"; role: AppRole }
  | { status: "needsConfirmation" }
  | { status: "needsNewPassword" };

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const { isSignedIn, nextStep } = await signIn({
    username: input.email,
    password: input.password,
  });

  if (!isSignedIn) {
    if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
      return { status: "needsConfirmation" };
    }
    if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
      return { status: "needsNewPassword" };
    }
    throw new Error(`Paso de inicio de sesión no soportado: ${nextStep.signInStep}`);
  }

  await ensureProfile();
  return { status: "signedIn", role: await currentRole() };
}

export async function logout() {
  clearPendingProfile();
  await amplifySignOut();
}

export async function startPasswordReset(email: string) {
  await resetPassword({ username: email });
}

export async function finishPasswordReset(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  await confirmResetPassword({
    username: input.email,
    confirmationCode: input.code,
    newPassword: input.newPassword,
  });
}

/**
 * The viewer's Cognito groups, read straight from the ID token.
 *
 * Deliberately NOT `fetchAuthSession()`: that also resolves identity-pool
 * credentials, an extra `GetId` + `GetCredentialsForIdentity` round trip we do
 * not need to read a claim. Because the auth context re-reads the role on
 * mount and on every Hub auth event, those calls added up fast enough for
 * Cognito to answer `TooManyRequestsException`, which surfaced in the browser
 * console as repeated 400s. The token provider returns the cached tokens
 * without touching the identity pool.
 */
export async function currentGroups(): Promise<string[]> {
  const tokens = await cognitoUserPoolsTokenProvider.getTokens();
  const groups = tokens?.idToken?.payload["cognito:groups"];
  return Array.isArray(groups)
    ? groups.filter((g): g is string => typeof g === "string")
    : [];
}

export async function currentRole(): Promise<AppRole> {
  return roleFromGroups(await currentGroups());
}

/**
 * Creates the signed-in user's profile row if it is missing, merging in the
 * details stashed by the sign-up form.
 *
 * Safe to call on every sign-in: it is a no-op once the row exists, which also
 * means a user whose profile creation failed the first time is repaired on
 * their next login rather than being stuck without one.
 */
export async function ensureProfile(): Promise<void> {
  const { userId } = await getCurrentUser();

  const existing = await client.models.UserProfile.get({ userId });
  if (existing.data) {
    clearPendingProfile();
    return;
  }

  const attrs = await fetchUserAttributes();
  const pending = readPendingProfile();
  const today = new Date().toISOString().slice(0, 10);

  const { errors } = await client.models.UserProfile.create({
    userId,
    email: attrs.email ?? "",
    name: pending?.name ?? attrs.name ?? attrs.email ?? "Atleta",
    phone: pending?.phone ? toE164(pending.phone) : attrs.phone_number,
    role: "ATHLETE",
    discipline: pending?.discipline,
    planTier: pending?.planTier,
    planStatus: pending?.planTier ? "PENDING" : undefined,
    memberSince: today,
    // Coaches never arrive through sign-up; an admin creates those accounts.
    coachStatus: "NONE",
    certifications: pending?.certifications,
    yearsExperience: pending?.yearsExperience,
    specialty: pending?.specialty,
    bio: pending?.bio,
    notifyClasses: true,
    notifyWorkouts: true,
    notifyWeekly: false,
    isActive: true,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  clearPendingProfile();
}
