import { auth } from "@clerk/nextjs/server";

/**
 * Returns the Clerk JWT token to be used for authenticating with the FastAPI backend.
 * Must be called from Server Components or Server Actions.
 */
export async function getAuthToken() {
  const { getToken } = await auth();
  const token = await getToken();
  return token;
}
