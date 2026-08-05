export interface Session {
  created: number;
  authProvider: "monstro" | "vercel" | "github";
  user: {
    id: string;
    username: string;
    email: string | undefined;
    avatar: string;
    name?: string;
  };
}

export interface SessionUserInfo {
  user: Session["user"] | undefined;
  authProvider?: "monstro" | "vercel" | "github";
  isAdmin?: boolean;
  isManagedTemplateTrialUser?: boolean;
  hasGitHub?: boolean;
  hasGitHubAccount?: boolean;
  hasGitHubInstallations?: boolean;
}
