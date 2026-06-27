"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { FolderGit2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const requestSchema = z.object({
  projectId: z.string().uuid("Please select a project"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  source: z.enum(["MANUAL", "EMAIL", "API", "SUPPORT"]),
});

type RequestFormInput = z.infer<typeof requestSchema>;

export default function NewFeatureRequestPage() {
  const router = useRouter();

  // Query projects for select drop-down
  const { data: projectsEnvelope, isLoading: isProjectsLoading } = trpc.project.list.useQuery();
  const projects = projectsEnvelope?.data ?? [];

  // Mutation
  const createMutation = trpc.featureRequest.create.useMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      projectId: "",
      title: "",
      description: "",
      priority: "MEDIUM",
      source: "MANUAL",
    },
  });

  const onSubmit = async (data: RequestFormInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Feature request registered!");
      router.push("/feature-requests");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feature request");
    }
  };

  if (isProjectsLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  // Guard: If no projects exist, force project creation first
  if (projects.length === 0) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-2">
          <Link href="/feature-requests">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Link>
        </Button>
        <Card className="border border-dashed border-border/60 bg-card/10 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <FolderGit2 className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No Active Projects Available</h3>
            <p className="text-sm text-muted-foreground">
              Every feature request must belong to a project. Please create a project before adding a request.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/projects">Manage Projects</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/feature-requests">
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Link>
      </Button>

      <Card className="border border-border/40 bg-card/60 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle>Submit Feature Request</CardTitle>
          <CardDescription>
            Register requirements from customers or internal sprints.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Project Select */}
            <div className="space-y-2">
              <Label htmlFor="proj-select">Associated Project</Label>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="proj-select" className="bg-background/50 border-border/60">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/90 border-border/60">
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && (
                <p className="text-xs font-medium text-destructive">{errors.projectId.message}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Implement dynamic billing reports"
                className="bg-background/50 border-border/60"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs font-medium text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder="Detail what persona this is for, the goals, success metrics, and expected behavior flow..."
                className="min-h-[120px] bg-background/50 border-border/60"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs font-medium text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Priority & Source Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="priority" className="bg-background/50 border-border/60">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/90 border-border/60">
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source Channel</Label>
                <Controller
                  name="source"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="source" className="bg-background/50 border-border/60">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/90 border-border/60">
                        <SelectItem value="MANUAL">Manual Input</SelectItem>
                        <SelectItem value="EMAIL">Email Integration</SelectItem>
                        <SelectItem value="API">API Endpoint</SelectItem>
                        <SelectItem value="SUPPORT">Support Desk</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border/30 pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/feature-requests">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Registering...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
