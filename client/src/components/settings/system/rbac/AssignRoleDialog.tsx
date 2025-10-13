import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoles, assignRoleToUser } from "@/lib/rbac-api";

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: Array<{ id: number; name: string }>;
  };
}

export function AssignRoleDialog({ open, onOpenChange, user }: AssignRoleDialogProps) {
  const { toast } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const { data: rolesData } = useQuery({
    queryKey: ["/api/admin/rbac/roles"],
    queryFn: getRoles,
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: (roleId: number) => assignRoleToUser(user.id, roleId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/users"] });
      onOpenChange(false);
      setSelectedRoleId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  const roles = rolesData?.roles || [];
  const userRoleIds = new Set(user.roles.map((r) => r.id));
  const availableRoles = roles.filter((role) => !userRoleIds.has(role.id));

  const handleAssign = () => {
    if (!selectedRoleId) return;
    assignMutation.mutate(parseInt(selectedRoleId));
  };

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email.split("@")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Assign Role
          </DialogTitle>
          <DialogDescription className="text-xs">
            Assign a new role to <strong>{displayName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Roles */}
          {user.roles.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Current Roles</Label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {user.roles.map((role) => (
                  <Badge key={role.id} variant="secondary" className="text-xs">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <Label htmlFor="role" className="text-xs">
              Select Role
            </Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger id="role" className="h-9 text-xs mt-1.5">
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    No available roles to assign
                  </div>
                ) : (
                  availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            System
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          {selectedRoleId && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium">Role Assignment</p>
                  <p className="mt-1">
                    This user will immediately gain all permissions associated with this role.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!selectedRoleId || assignMutation.isPending}
            className="h-8 px-3 text-xs"
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
