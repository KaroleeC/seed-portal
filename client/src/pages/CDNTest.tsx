import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server } from "lucide-react";

export default function CDNTest() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">CDN Monitoring Test</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Simple CDN Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>If you can see this page, the CDN monitoring route is working!</p>
          <Button onClick={() => (window.location.href = "/cdn-monitoring")} className="mt-4">
            Go to Full CDN Monitoring
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
