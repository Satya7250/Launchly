"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface WorkspaceContextType {
  user: any;
  session: any;
  activeWorkspace: any;
  activeRole: any;
  membership: any;
  workspaces: Array<{ workspace: any; role: string }>;
  isLoading: boolean;
/* eslint-enable @typescript-eslint/no-explicit-any */
  refetch: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();

  // Query active session & workspace resolution
  const {
    data: sessionEnvelope,
    isLoading: isSessionLoading,
    refetch: refetchSession,
  } = trpc.auth.getSession.useQuery(undefined, {
    retry: false,
  });

  const sessionData = sessionEnvelope?.data;
  const user = sessionData?.user ?? null;
  const session = sessionData?.session ?? null;
  const activeWorkspace = sessionData?.workspace?.active ?? null;
  const activeRole = sessionData?.workspace?.role ?? null;
  const membership = sessionData?.workspace?.membership ?? null;

  // Query member workspaces list
  const {
    data: workspacesEnvelope,
    isLoading: isWorkspacesLoading,
    refetch: refetchWorkspaces,
  } = trpc.workspace.getWorkspaces.useQuery(undefined, {
    enabled: !!user,
  });

  const workspaces = workspacesEnvelope?.data ?? [];

  const switchMutation = trpc.workspace.switchWorkspace.useMutation();
  const createMutation = trpc.workspace.createWorkspace.useMutation();
  const signOutMutation = trpc.auth.signOut.useMutation();

  const handleRefetch = async () => {
    await refetchSession();
    if (user) {
      await refetchWorkspaces();
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await switchMutation.mutateAsync({ workspaceId });
      toast.success("Switched workspace");
      await handleRefetch();
      router.push("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to switch workspace");
    }
  };

  const handleCreateWorkspace = async (name: string) => {
    try {
      await createMutation.mutateAsync({ name });
      toast.success("Workspace created");
      await handleRefetch();
      router.push("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      toast.success("Logged out successfully");
      await refetchSession();
      router.push("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const isLoading = isSessionLoading || (!!user && isWorkspacesLoading);

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        session,
        activeWorkspace,
        activeRole,
        membership,
        workspaces,
        isLoading,
        refetch: handleRefetch,
        switchWorkspace: handleSwitchWorkspace,
        createWorkspace: handleCreateWorkspace,
        signOut: handleSignOut,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
