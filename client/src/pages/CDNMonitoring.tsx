import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { 
  Server, 
  Zap, 
  Database, 
  Activity, 
  RefreshCw, 
  BarChart3,
  FileText,
  Shield,
  Clock,
  Gauge
} from 'lucide-react';

interface CDNHealthData {
  status: string;
  assetsLoaded: number;
  version: string;
  baseUrl: string;
}

interface CompressionStats {
  requests: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  compressionRatio: number;
  averageCompressionRatio: number;
}

interface CDNPerformance {
  totalAssets: number;
  totalSize: number;
  averageSize: number;
  lastUpdated: string;
  cacheHeaders: string;
  compression: string;
}

interface AssetManifest {
  version: string;
  baseUrl: string;
  assets: {
    [key: string]: {
      hash: string;
      url: string;
      size: number;
      contentType: string;
      lastModified: string;
    };
  };
}

export default function CDNMonitoring() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<any>(null);

  // Fetch CDN health
  const { data: cdnHealth, isLoading: healthLoading } = useQuery<CDNHealthData>({
    queryKey: ['/api/cdn/health'],
    queryFn: async (): Promise<CDNHealthData> => apiRequest('/api/cdn/health'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch compression stats
  const { data: compressionStats, isLoading: compressionLoading } = useQuery<CompressionStats>({
    queryKey: ['/api/cdn/compression-stats'],
    queryFn: async (): Promise<CompressionStats> => apiRequest('/api/cdn/compression-stats'),
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch CDN performance
  const { data: cdnPerformance, isLoading: performanceLoading } = useQuery<CDNPerformance>({
    queryKey: ['/api/cdn/performance'],
    queryFn: async (): Promise<CDNPerformance> => apiRequest('/api/cdn/performance'),
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch asset manifest
  const { data: assetManifest, isLoading: manifestLoading } = useQuery<AssetManifest>({
    queryKey: ['/api/assets/manifest'],
    queryFn: async (): Promise<AssetManifest> => apiRequest('/api/assets/manifest')
  });

  // Reset compression stats mutation
  const resetStatsMutation = useMutation({
    mutationFn: () => apiRequest('/api/cdn/reset-compression-stats', {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cdn/compression-stats'] });
    },
    onError: (error) => {
      console.error('Failed to reset compression stats:', error);
    }
  });

  // Rebuild manifest mutation
  const rebuildManifestMutation = useMutation({
    mutationFn: () => apiRequest('/api/cdn/rebuild-manifest', {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets/manifest'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cdn/performance'] });
    },
    onError: (error) => {
      console.error('Failed to rebuild asset manifest:', error);
    }
  });

  // Run comprehensive CDN test
  const runCDNTest = async () => {
    setTestResults({ testing: true });
    
    try {
      type TestEntry = { name: string; status: string; details?: any; error?: any };
      const results: { timestamp: string; tests: TestEntry[] } = {
        timestamp: new Date().toISOString(),
        tests: []
      };

      // Test 1: Health Check
      try {
        const health = await apiRequest('/api/cdn/health');
        results.tests.push({
          name: 'CDN Health Check',
          status: health.status === 'healthy' ? 'passed' : 'failed',
          details: health
        });
      } catch (error: any) {
        results.tests.push({
          name: 'CDN Health Check',
          status: 'failed',
          error: error.message
        });
      }

      // Test 2: Compression Test
      try {
        const stats = await apiRequest('/api/cdn/compression-stats');
        results.tests.push({
          name: 'Compression Statistics',
          status: 'passed',
          details: {
            ratio: stats.averageCompressionRatio,
            requests: stats.requests,
            savings: Math.round((1 - stats.averageCompressionRatio) * 100) + '%'
          }
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Compression Statistics',
          status: 'failed',
          error: error.message
        });
      }

      // Test 3: Asset Manifest
      try {
        const manifest = await apiRequest('/api/assets/manifest');
        results.tests.push({
          name: 'Asset Manifest',
          status: Object.keys(manifest.assets || {}).length > 0 ? 'passed' : 'warning',
          details: {
            assets: Object.keys(manifest.assets || {}).length,
            version: manifest.version
          }
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Asset Manifest',
          status: 'failed',
          error: error.message
        });
      }

      // Test 4: Performance Metrics
      try {
        const performance = await apiRequest('/api/cdn/performance');
        results.tests.push({
          name: 'Performance Metrics',
          status: 'passed',
          details: performance
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Performance Metrics',
          status: 'failed',
          error: error.message
        });
      }

      setTestResults(results);
    } catch (error: any) {
      setTestResults({
        error: 'Failed to run comprehensive test',
        details: error.message
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressionSavings = compressionStats ? 
    Math.round((1 - compressionStats.averageCompressionRatio) * 100) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            CDN Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor content delivery network performance and optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runCDNTest}
            disabled={testResults?.testing}
            variant="outline"
          >
            <Activity className="w-4 h-4 mr-2" />
            Run Test Suite
          </Button>
          <Button 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/cdn/'] });
              queryClient.invalidateQueries({ queryKey: ['/api/assets/'] });
            }}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compression">Compression</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CDN Status</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthLoading ? '...' : cdnHealth?.status === 'healthy' ? 'Healthy' : 'Issues'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cdnHealth?.assetsLoaded || 0} assets loaded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compression</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {compressionLoading ? '...' : `${compressionSavings}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Size reduction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceLoading ? '...' : cdnPerformance?.totalAssets || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(cdnPerformance?.totalSize || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {compressionLoading ? '...' : compressionStats?.requests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Compressed responses
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Cache Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Static Assets Cache</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">1 year</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Immutable Assets</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">Enabled</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Security Headers</span>
                  <span className={`px-2 py-1 rounded-md text-sm ${
                    cdnPerformance?.cacheHeaders === 'enabled' ? 
                    'bg-green-100 text-green-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cdnPerformance?.cacheHeaders || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Compression</span>
                  <span className={`px-2 py-1 rounded-md text-sm ${
                    cdnPerformance?.compression === 'enabled' ? 
                    'bg-green-100 text-green-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cdnPerformance?.compression || 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Average Asset Size</span>
                  <span className="font-mono">
                    {formatBytes(cdnPerformance?.averageSize || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Last Updated</span>
                  <span className="text-sm text-muted-foreground">
                    {cdnPerformance?.lastUpdated ? 
                      new Date(cdnPerformance.lastUpdated).toLocaleTimeString() : 
                      'Unknown'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>CDN Version</span>
                  <span className="font-mono text-sm">
                    {cdnHealth?.version || 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compression" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Compression Statistics</CardTitle>
                <CardDescription>Real-time compression performance metrics</CardDescription>
              </div>
              <Button 
                onClick={() => resetStatsMutation.mutate()}
                disabled={resetStatsMutation.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Stats
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {compressionStats && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {compressionStats.requests}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Compressed Requests
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {formatBytes(compressionStats.totalOriginalSize - compressionStats.totalCompressedSize)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Bandwidth Saved
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {Math.round((1 - compressionStats.averageCompressionRatio) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Size Reduction
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Compression Efficiency</span>
                      <span>{Math.round((1 - compressionStats.averageCompressionRatio) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.round((1 - compressionStats.averageCompressionRatio) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Original Size:</span>
                      <div className="font-mono">{formatBytes(compressionStats.totalOriginalSize)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Compressed Size:</span>
                      <div className="font-mono">{formatBytes(compressionStats.totalCompressedSize)}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Asset Manifest</CardTitle>
                <CardDescription>Static asset inventory and metadata</CardDescription>
              </div>
              <Button 
                onClick={() => rebuildManifestMutation.mutate()}
                disabled={rebuildManifestMutation.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Rebuild Manifest
              </Button>
            </CardHeader>
            <CardContent>
              {manifestLoading ? (
                <div className="text-center py-8">Loading asset manifest...</div>
              ) : assetManifest?.assets ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(assetManifest.assets).length} assets in manifest (v{assetManifest.version})
                  </div>
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {(Object.entries(assetManifest.assets as Record<string, { hash: string; url: string; size: number; contentType: string; lastModified: string }>)).map(([path, asset]) => (
                      <div key={path} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate">{path}</div>
                          <div className="text-xs text-muted-foreground">
                            {asset.contentType} • {formatBytes(asset.size)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">
                          {asset.hash.substring(0, 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No assets found in manifest. Assets will be discovered when the build is generated.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                CDN Test Suite
              </CardTitle>
              <CardDescription>
                Comprehensive testing of CDN functionality and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runCDNTest}
                disabled={testResults?.testing}
                className="w-full"
              >
                <Activity className="w-4 h-4 mr-2" />
                {testResults?.testing ? 'Running Tests...' : 'Run Comprehensive CDN Test'}
              </Button>

              {testResults && !testResults.testing && (
                <div className="space-y-3">
                  {testResults.error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{testResults.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Test completed at {new Date(testResults.timestamp).toLocaleString()}
                      </div>
                      {testResults.tests?.map((test: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{test.name}</div>
                            {test.details && (
                              <div className="text-sm text-muted-foreground">
                                {typeof test.details === 'object' ? 
                                  JSON.stringify(test.details, null, 2) : 
                                  test.details
                                }
                              </div>
                            )}
                            {test.error && (
                              <div className="text-sm text-red-600">{test.error}</div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-md text-sm ${
                            test.status === 'passed' ? 'bg-green-100 text-green-800' : 
                            test.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {test.status}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}