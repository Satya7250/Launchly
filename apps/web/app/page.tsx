import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const envelope = await api.auth.getSession.query();
    if (envelope?.data?.user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return null;
}
