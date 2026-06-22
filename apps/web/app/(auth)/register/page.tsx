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
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Alex Mercer"
                className="bg-background/50 border-border/60 focus:border-ring"
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
                  <Spinner className="mr-2 h-4 w-4" /> Creating account...
                </>
              ) : (
                "Register"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
