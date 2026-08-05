import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session/get-server-session";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up your Open Agents workspace.",
};

export default async function GetStartedPage() {
  const session = await getServerSession();
  redirect(session?.user ? "/sessions" : "/");
}
