"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { useWorkspace } from "~/providers/workspace-context";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import Link from "next/link";
import { authClient } from "@repo/auth/client";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { refetch } = useWorkspace();
  const registerMutation = trpc.auth.signUp.useMutation();
  const loginMutation = trpc.auth.signIn.useMutation();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const isAnyLoading = isSubmitting || isGoogleLoading;

  const handleGoogleSignUp = async () => {
    if (isAnyLoading) return;
    setIsGoogleLoading(true);
    try {
      // Better Auth automatically creates a new account on first Google OAuth login
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/workspace/select",
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err?.message ?? "";
      if (message.toLowerCase().includes("cancel") || message.toLowerCase().includes("closed")) {
        toast.error("Sign up was cancelled.");
      } else {
        toast.error(message || "Google sign up failed. Please try again.");
      }
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    try {
      // 1. Sign up the user
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      // 2. Sign in to set the cookies/session
      await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      toast.success("Successfully registered!");

      // 3. Refresh context and redirect
      await refetch();
      router.push("/workspace/select");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Email might be in use.");
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <Card className="border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your details below to build your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth */}
          <Button
            id="google-signup-btn"
            type="button"
            variant="outline"
            className="w-full font-medium"
            disabled={isAnyLoading}
            onClick={handleGoogleSignUp}
          >
            {isGoogleLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Connecting to Google...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email / Password form */}
          <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Alex Mercer"
                className="bg-background/50 border-border/60 focus:border-ring"
                disabled={isAnyLoading}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="bg-background/50 border-border/60 focus:border-ring"
                disabled={isAnyLoading}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-background/50 border-border/60 focus:border-ring"
                disabled={isAnyLoading}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button
              id="email-register-btn"
              type="submit"
              className="w-full font-medium"
              disabled={isAnyLoading}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Creating account...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
