import "server-only";
import { auth } from "@/lib/auth/config";
import { getInstallationByUserAndId } from "@/lib/db/installations";
import {
  getConfiguredGitHubInstallation,
  getConfiguredInstallationToken,
} from "@/lib/github/app";

/**
 * Get a valid GitHub access token for the given user.
 * better-auth auto-refreshes expired tokens via stored refresh token.
 */
export async function getUserGitHubToken(
  userId: string,
): Promise<string | null> {
  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: "github", userId },
    });
    if (result?.accessToken) return result.accessToken;
  } catch (error) {
    const isExpected =
      error instanceof Error && error.message === "Account not found";
    if (!isExpected) {
      console.error("Error fetching GitHub token:", error);
    }
  }

  const configured = getConfiguredGitHubInstallation();
  if (!configured) return null;

  const installation = await getInstallationByUserAndId(
    userId,
    configured.installationId,
  );
  return installation ? getConfiguredInstallationToken() : null;
}

export async function getGitHubAppUserToken(
  userId: string,
): Promise<string | null> {
  return getUserGitHubToken(userId);
}
