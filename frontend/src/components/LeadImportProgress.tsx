// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LEAD IMPORT PROGRESS COMPONENT
// ============================================================================
// React component to display real-time progress of lead import jobs
// Supports polling for progress updates and batch status tracking
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface QueueProgress {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  currentBatch: number;
  totalBatches: number;
  processedLeads: number;
  totalLeads: number;
  importedLeads: number;
  duplicateLeads: number;
  errorCount: number;
  currentBatchStatus: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface LeadImportProgressProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  pollInterval?: number; // Default: 2000ms
  autoStart?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeadImportProgress({
  jobId,
  onComplete,
  onError,
  pollInterval = 2000,
  autoStart = true,
}: LeadImportProgressProps) {
  const [progress, setProgress] = useState<QueueProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(autoStart);
  const [result, setResult] = useState<any>(null);

  // ==========================================================================
  // FETCH PROGRESS
  // ==========================================================================

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/leads/import/progress/${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data: QueueProgress = await response.json();
      setProgress(data);
      setError(null);

      // If completed, fetch result and stop polling
      if (data.status === 'completed') {
        setPolling(false);
        setLoading(false);

        // Fetch final result
        const resultResponse = await fetch(`/api/v1/leads/import/result/${jobId}`);
        const resultData = await resultResponse.json();
        setResult(resultData);

        if (onComplete) {
          onComplete(resultData);
        }
      }

      // If failed, stop polling and call error handler
      if (data.status === 'failed') {
        setPolling(false);
        setLoading(false);
        const errorMsg = data.error || 'Import job failed';

        if (onError) {
          onError(errorMsg);
        }
      }

    } catch (err) {
      console.error('Error fetching progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
      setPolling(false);
      setLoading(false);
    }
  }, [jobId, onComplete, onError]);

  // ==========================================================================
  // POLLING EFFECT
  // ==========================================================================

  useEffect(() => {
    if (!polling) return;

    // Initial fetch
    fetchProgress();

    // Set up polling
    const interval = setInterval(fetchProgress, pollInterval);

    return () => clearInterval(interval);
  }, [polling, pollInterval, fetchProgress]);

  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================

  const successRate = progress ? Math.round((progress.importedLeads / Math.max(progress.processedLeads, 1)) * 100) : 0;
  const elapsedTime = progress?.startedAt
    ? Math.round((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
    : 0;
  const estimatedTimeRemaining = progress && progress.progress > 0
    ? Math.round((elapsedTime / progress.progress) * (100 - progress.progress))
    : 0;

  // ==========================================================================
  // STATUS ICON
  // ==========================================================================

  const getStatusIcon = () => {
    if (!progress) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'active':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'waiting':
      case 'delayed':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // ==========================================================================
  // STATUS BADGE
  // ==========================================================================

  const getStatusBadge = () => {
    if (!progress) return null;

    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      active: 'secondary',
      waiting: 'outline',
      delayed: 'outline',
    };

    return (
      <Badge variant={variants[progress.status] || 'outline'}>
        {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
      </Badge>
    );
  };

  // ==========================================================================
  // FORMAT TIME
  // ==========================================================================

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading && !progress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading progress...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !progress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-500">
            <XCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Lead Import Progress</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Job ID: {jobId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{progress?.progress || 0}%</span>
          </div>
          <Progress value={progress?.progress || 0} className="h-2" />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Processed</p>
            <p className="text-2xl font-bold">{progress?.processedLeads || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Imported</p>
            <p className="text-2xl font-bold text-green-600">{progress?.importedLeads || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Duplicates</p>
            <p className="text-2xl font-bold text-yellow-600">{progress?.duplicateLeads || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-600">{progress?.errorCount || 0}</p>
          </div>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Leads</span>
                <span className="font-medium">{progress?.totalLeads || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">{successRate}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Status</span>
                <span className="font-medium">{progress?.currentBatchStatus || 'N/A'}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batches" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Batch</span>
                <span className="font-medium">
                  {progress?.currentBatch || 0} / {progress?.totalBatches || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Batch Progress</span>
                <span className="font-medium">
                  {progress?.totalBatches && progress.totalBatches > 0
                    ? Math.round(((progress?.currentBatch || 0) / progress.totalBatches) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                value={
                  progress?.totalBatches && progress.totalBatches > 0
                    ? ((progress?.currentBatch || 0) / progress.totalBatches) * 100
                    : 0
                }
                className="h-2"
              />
            </div>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Elapsed Time</span>
                <span className="font-medium">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Remaining</span>
                <span className="font-medium">
                  {progress?.status === 'completed' ? 'Completed' : formatTime(estimatedTimeRemaining)}
                </span>
              </div>
              {progress?.startedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Started At</span>
                  <span className="font-medium">
                    {new Date(progress.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {progress?.completedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed At</span>
                  <span className="font-medium">
                    {new Date(progress.completedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {!polling && progress?.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPolling(true)}
              >
                <Clock className="mr-2 h-4 w-4" />
                Resume Polling
              </Button>
            )}
            {polling && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPolling(false)}
              >
                Pause Polling
              </Button>
            )}
          </div>

          {progress?.status === 'completed' && result && (
            <Button size="sm" onClick={() => window.location.href = '/leads'}>
              View Leads
            </Button>
          )}
        </div>

        {/* Error Display */}
        {progress?.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{progress.error}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default LeadImportProgress;
