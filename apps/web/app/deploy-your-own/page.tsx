import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const DEPLOY_ENV_VARS = [
  "POSTGRES_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "MONSTRO_AUTH_URL",
  "MONSTRO_AGENT_SSO_SECRET",
  "VERCEL_ACCESS_TOKEN",
  "GITHUB_APP_ID",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_APP_INSTALLATION_ID",
  "GITHUB_APP_ACCOUNT_LOGIN",
] as const;

const DEPLOY_PRODUCTS = [
  {
    type: "integration",
    protocol: "storage",
    productSlug: "neon",
    integrationSlug: "neon",
  },
  {
    type: "integration",
    protocol: "storage",
    productSlug: "upstash-kv",
    integrationSlug: "upstash",
  },
] as const;

const DEPLOY_TEMPLATE_URL = (() => {
  const params = new URLSearchParams([
    ["project-name", "monstro-agent"],
    ["repository-name", "monstro-agent"],
    ["repository-url", "https://github.com/Monstro-X/monstro-agent"],
    ["demo-title", "Monstro Agent"],
    ["demo-description", "Monstro's hosted background coding agent."],
    ["env", DEPLOY_ENV_VARS.join(",")],
    [
      "envDescription",
      "Neon can provide POSTGRES_URL automatically. Generate BETTER_AUTH_SECRET and MONSTRO_AGENT_SSO_SECRET yourself, then add the Monstro Admin URL, billing-owner Vercel token, and shared GitHub App installation.",
    ],
    ["products", encodeURIComponent(JSON.stringify(DEPLOY_PRODUCTS))],
    ["skippable-integrations", "1"],
  ]);

  return `https://vercel.com/new/clone?${params.toString()}`;
})();

export const metadata: Metadata = {
  title: "Deploy your own",
  description:
    "Deploy your own copy of Open Agents to unlock the full template.",
};

export default function DeployYourOwnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="flex max-w-xl flex-col items-center text-center">
        <p className="text-sm font-medium text-muted-foreground">Open Agents</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Deploy your own
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          This hosted demo has limited functionality. Deploy your own copy to
          unlock the full Open Agents template.
        </p>
        <Button asChild className="mt-8" size="lg">
          <Link href={DEPLOY_TEMPLATE_URL} rel="noreferrer" target="_blank">
            Deploy your own version of this template now
          </Link>
        </Button>
      </div>
    </main>
  );
}
