import type { NextRequest } from "next/server";
import {
  getInstallationsByUserId,
  upsertInstallation,
} from "@/lib/db/installations";
import { getConfiguredGitHubInstallation } from "@/lib/github/app";
import { hasGitHubAccount as checkGitHubLinked } from "@/lib/github/users";
import { isUserAdmin, userExists } from "@/lib/db/users";
import { isManagedTemplateTrialUser } from "@/lib/managed-template-trial";
import { getSessionFromReq } from "@/lib/session/server";
import type { SessionUserInfo } from "@/lib/session/types";

const UNAUTHENTICATED: SessionUserInfo = { user: undefined };

export async function GET(req: NextRequest) {
  const session = await getSessionFromReq(req);

  if (!session?.user?.id) {
    return Response.json(UNAUTHENTICATED);
  }

  // run the user-existence check in parallel with the github queries
  // so there is zero added latency on the happy path.
  const [exists, hasGitHubAccount, installations, isAdmin] = await Promise.all([
    userExists(session.user.id),
    checkGitHubLinked(session.user.id),
    getInstallationsByUserId(session.user.id),
    isUserAdmin(session.user.id),
  ]);

  if (!exists) {
    return Response.json(UNAUTHENTICATED);
  }
  let hasGitHubInstallations = installations.length > 0;
  const configuredInstallation = getConfiguredGitHubInstallation();
  if (
    configuredInstallation &&
    !installations.some(
      ({ installationId }) =>
        installationId === configuredInstallation.installationId,
    )
  ) {
    await upsertInstallation({
      userId: session.user.id,
      ...configuredInstallation,
      accountType: "Organization",
      repositorySelection: "selected",
    });
    hasGitHubInstallations = true;
  }

  const hasGitHub = hasGitHubAccount || hasGitHubInstallations;

  const data: SessionUserInfo = {
    user: session.user,
    authProvider: session.authProvider,
    isAdmin,
    isManagedTemplateTrialUser: isManagedTemplateTrialUser(session, req.url),
    hasGitHub,
    hasGitHubAccount,
    hasGitHubInstallations,
  };

  return Response.json(data);
}
