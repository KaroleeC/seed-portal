import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Mail, Shield } from "lucide-react";

export default function RequestAccess() {
  const { user: googleUser, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [requestSent, setRequestSent] = useState(false);

  const requestAccessMutation = useMutation({
    mutationFn: async () => {
      if (!googleUser) throw new Error("No Google user found");

      await apiRequest("/api/auth/request-access", {
        method: "POST",
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
        }),
      });
    },
    onSuccess: () => {
      setRequestSent(true);
      toast({
        title: "Access Request Sent",
        description: "The admin has been notified of your access request.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description:
          error.message || "Failed to send access request. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Required
          </CardTitle>
          <CardDescription className="text-gray-600">
            You need admin approval to access the Seed Financial portal
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Your Account
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900">{googleUser?.name}</span>
              <Badge variant="outline" className="text-xs">
                {googleUser?.email}
              </Badge>
            </div>
          </div>

          {!requestSent ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 leading-relaxed">
                <p className="mb-2">
                  Your Google Workspace account is valid, but you haven't been
                  granted portal access yet.
                </p>
                <p>
                  Click below to notify the admin and request access to the
                  portal.
                </p>
              </div>

              <Button
                onClick={() => requestAccessMutation.mutate()}
                disabled={requestAccessMutation.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {requestAccessMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Request Portal Access
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Request sent successfully!</p>
                  <p className="text-green-600 mt-1">
                    The admin has been notified via Slack and will review your
                    request.
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>What happens next:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Admin receives your request via direct message</li>
                  <li>If approved, you'll be added to the portal</li>
                  <li>Try signing in again once you're notified</li>
                </ul>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
