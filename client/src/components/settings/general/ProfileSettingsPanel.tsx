import React, { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { updateProfileSchema, type UpdateProfile } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function ProfileSettingsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatPhoneNumber = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length >= 10)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    if (digits.length >= 6)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length >= 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return digits;
  }, []);

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phoneNumber: user?.phoneNumber || "",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      zipCode: user?.zipCode || "",
      country: user?.country || "US",
      profilePhoto: user?.profilePhoto || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile Updated", description: "Your profile was saved." });
    },
    onError: (err: unknown) =>
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
  });

  const onSubmit = (data: UpdateProfile) => updateProfileMutation.mutate(data);

  return (
    <div className="space-y-3 text-xs">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Profile & Preferences</CardTitle>
          <CardDescription className="text-xs">
            Update your profile and app preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only basics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Name</Label>
              <Input
                className="h-8"
                value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
                disabled
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Email</Label>
              <Input className="h-8" value={user?.email ?? ""} disabled />
            </div>
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Contact */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">Contact</h3>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8"
                          placeholder="(555) 555-5555"
                          {...field}
                          onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Address */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Street Address</FormLabel>
                        <FormControl>
                          <Input className="h-8" placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">City</FormLabel>
                        <FormControl>
                          <Input className="h-8" placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">State</FormLabel>
                        <FormControl>
                          <Input className="h-8" placeholder="CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">ZIP</FormLabel>
                        <FormControl>
                          <Input className="h-8" placeholder="90210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 px-3"
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
