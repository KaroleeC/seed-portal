import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { pricingKeys } from "@/lib/queryKeys";
import { Save } from "lucide-react";

interface PricingBase {
  id: number;
  service: string;
  baseFee: string;
  description: string;
  updatedAt: string;
}

export default function PricingBaseInlinePanel() {
  const { toast } = useToast();
  const { data: baseFees, isLoading } = useQuery<PricingBase[]>({
    queryKey: pricingKeys.admin.base(),
    queryFn: async () => await apiRequest<PricingBase[]>("GET", "/api/admin/pricing/base"),
  });

  const [editing, setEditing] = useState<{ id: number; baseFee: string } | null>(null);

  const updateBaseFee = useMutation({
    mutationFn: (data: { id: number; baseFee: string }) =>
      apiRequest(`/api/admin/pricing/base/${data.id}`, {
        method: "PUT",
        body: { baseFee: data.baseFee },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.admin.base() });
      toast({ title: "Base fee updated successfully" });
      setEditing(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating base fee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? "$0" : `$${num.toLocaleString()}`;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <Card className="bg-white/95">
      <CardHeader>
        <CardTitle>Service Base Fees</CardTitle>
        <CardDescription>Base monthly fees for each service type</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Base Fee</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(baseFees || []).map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.service}</TableCell>
                  <TableCell>
                    {editing?.id === fee.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editing.baseFee}
                          onChange={(e) => setEditing({ id: fee.id, baseFee: e.target.value })}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            updateBaseFee.mutate({ id: fee.id, baseFee: editing.baseFee })
                          }
                          disabled={updateBaseFee.isPending}
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      formatCurrency(fee.baseFee)
                    )}
                  </TableCell>
                  <TableCell>{fee.description}</TableCell>
                  <TableCell>{formatDate(fee.updatedAt)}</TableCell>
                  <TableCell>
                    {editing?.id !== fee.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ id: fee.id, baseFee: fee.baseFee })}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
