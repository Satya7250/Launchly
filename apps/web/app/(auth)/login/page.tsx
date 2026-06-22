"use client";

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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { refetch } = useWorkspace();
  const loginMutation = trpc.auth.signIn.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await loginMutation.mutateAsync(data);
      toast.success("Successfully logged in!");
      
      // Refresh workspace context
      await refetch();

      // Redirect correctly based on membership presence
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <Card className="border border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
            Welcome back
          </CardTitle>
          <CardDescription>
            Enter your email to sign in to your ShipFlow account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="bg-background/50 border-border/60 focus:border-ring"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                className="bg-background/50 border-border/60 focus:border-ring"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-medium" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline underline-offset-4 hover:text-foreground">
                Register
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
