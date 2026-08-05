import type { Metadata } from "next";
import {
  getConfiguredGitHubInstallation,
  isGitHubAppConfigured,
} from "@/lib/github/app";
import { getVercelAccessToken } from "@/lib/vercel/token";

export const metadata: Metadata = {
  title: "Connections",
  description: "Manage your connected accounts and integrations.",
};

function ManagedConnection({
  name,
  description,
  configured,
}: {
  name: string;
  description: string;
  configured: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span
          className={
            configured
              ? "text-xs text-emerald-600 dark:text-emerald-400"
              : "text-xs text-amber-600 dark:text-amber-400"
          }
        >
          {configured ? "Managed" : "Needs configuration"}
        </span>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const githubConfigured =
    isGitHubAppConfigured() && Boolean(getConfiguredGitHubInstallation());
  const vercelConfigured = Boolean(getVercelAccessToken());

  return (
    <>
      <h1 className="text-2xl font-semibold">Connections</h1>
      <ManagedConnection
        name="GitHub"
        description="Repository access uses the shared Monstro GitHub App. Editors do not connect personal accounts."
        configured={githubConfigured}
      />
      <ManagedConnection
        name="Vercel"
        description="Project discovery uses Monstro's server-side Vercel token. Editors do not connect Vercel accounts."
        configured={vercelConfigured}
      />
    </>
  );
}
