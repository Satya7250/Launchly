"use client";

import { useWorkspace } from "~/providers/workspace-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "~/components/ui/spinner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, activeWorkspace, isLoading } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (activeWorkspace) {
        router.push("/dashboard");
      } else {
        router.push("/workspace/select");
      }
    }
  }, [user, activeWorkspace, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen min-w-screen flex justify-center items-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      {children}
    </div>
  );
}
