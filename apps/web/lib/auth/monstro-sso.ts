import { timingSafeEqual } from "node:crypto";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { deriveAuthUsername } from "@/lib/auth/username";
import { upsertInstallation } from "@/lib/db/installations";
import { getConfiguredGitHubInstallation } from "@/lib/github/app";

const identitySchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  image: z.string().nullable(),
  role: z.enum(["Staff", "Admin"]),
});

const bootstrapSchema = z.object({
  code: z.string().min(32),
  expiresAt: z.number().int(),
  user: identitySchema,
});

function hasValidSecret(authorization: string | null): boolean {
  const expected = process.env.MONSTRO_AGENT_SSO_SECRET;
  const provided = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!expected || !provided) return false;

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}

function safeCallbackURL(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function monstroSso() {
  return {
    id: "monstro-sso",
    endpoints: {
      bootstrapMonstroSso: createAuthEndpoint(
        "/monstro/bootstrap",
        { method: "POST", body: bootstrapSchema },
        async (ctx) => {
          if (
            !hasValidSecret(ctx.request?.headers.get("authorization") ?? null)
          ) {
            throw ctx.error("UNAUTHORIZED", {
              message: "Invalid handoff secret",
            });
          }

          const expiresAt = new Date(ctx.body.expiresAt);
          const now = Date.now();
          if (
            expiresAt.getTime() <= now ||
            expiresAt.getTime() > now + 60_000
          ) {
            throw ctx.error("BAD_REQUEST", {
              message: "Invalid handoff expiry",
            });
          }

          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `monstro-sso:${ctx.body.code}`,
            value: JSON.stringify(ctx.body.user),
            expiresAt,
          });

          return ctx.json({ ok: true });
        },
      ),
      completeMonstroSso: createAuthEndpoint(
        "/monstro/callback",
        {
          method: "GET",
          query: z.object({
            code: z.string().min(32),
            callbackURL: z.string().optional(),
          }),
        },
        async (ctx) => {
          const verification =
            await ctx.context.internalAdapter.consumeVerificationValue(
              `monstro-sso:${ctx.query.code}`,
            );
          if (!verification) {
            throw ctx.error("BAD_REQUEST", {
              message: "This sign-in link is invalid or expired",
            });
          }

          let decoded: unknown;
          try {
            decoded = JSON.parse(verification.value);
          } catch {
            throw ctx.error("BAD_REQUEST", { message: "Invalid identity" });
          }

          const parsed = identitySchema.safeParse(decoded);
          if (!parsed.success) {
            throw ctx.error("BAD_REQUEST", { message: "Invalid identity" });
          }
          const identity = parsed.data;
          const adapter = ctx.context.internalAdapter;
          const linkedAccount = await adapter.findAccountByProviderId(
            identity.sub,
            "monstro",
          );
          const linkedUser = linkedAccount
            ? await adapter.findUserById(linkedAccount.userId)
            : null;
          const emailUser = linkedUser
            ? null
            : await adapter.findUserByEmail(identity.email, {
                includeAccounts: true,
              });

          let user = linkedUser ?? emailUser?.user;
          if (!user) {
            user = await adapter.createUser({
              email: identity.email,
              emailVerified: true,
              name: identity.name,
              image: identity.image,
              username: deriveAuthUsername(identity),
              isAdmin: identity.role === "Admin",
              lastLoginAt: new Date(),
            });
            await adapter.linkAccount({
              accountId: identity.sub,
              providerId: "monstro",
              userId: user.id,
            });
          } else {
            if (!linkedAccount) {
              await adapter.linkAccount({
                accountId: identity.sub,
                providerId: "monstro",
                userId: user.id,
              });
            }
            user = await adapter.updateUser(user.id, {
              email: identity.email,
              emailVerified: true,
              name: identity.name,
              image: identity.image,
              username: deriveAuthUsername(identity),
              isAdmin: identity.role === "Admin",
              lastLoginAt: new Date(),
            });
          }

          const githubInstallation = getConfiguredGitHubInstallation();
          if (githubInstallation) {
            await upsertInstallation({
              userId: user.id,
              ...githubInstallation,
              accountType: "Organization",
              repositorySelection: "selected",
            });
          }

          const session = await adapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });

          const baseURL =
            process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
          throw ctx.redirect(
            new URL(safeCallbackURL(ctx.query.callbackURL), baseURL).toString(),
          );
        },
      ),
    },
  };
}
