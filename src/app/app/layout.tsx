import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  if (!session.user.subscriptionActive) {
    redirect("/pricing?message=subscribe");
  }

  return <>{children}</>;
}
