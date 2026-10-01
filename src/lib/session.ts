import { users, type User } from "./demo-data";

/**
 * DEMO ONLY: every request acts as the same synthetic user.
 *
 * Before any deployment, replace this with real authentication (for example
 * Auth.js with Microsoft Entra ID, or Amazon Cognito) and read the user from
 * the verified session. Every server action calls this, so it is the single
 * place to wire SSO in.
 */
export async function getCurrentUser(): Promise<User> {
  return users[0];
}
