// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LEAD IMPORT FORM COMPONENT
// ============================================================================
// React component for initiating lead import requests with queue support
// Handles form validation and displays progress after submission
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LeadImportProgress from './LeadImportProgress';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ImportFormData {
  location: string;
  query: string;
  radius: number;
  minRating: number;
  maxResults: number;
  extractEmails: boolean;
  batchSize: number;
}

interface ImportResponse {
  message: string;
  jobId: string;
  location: string;
  maxResults: number;
  batchSize: number;
  estimatedBatches: number;
  statusUrl: string;
  progressUrl: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeadImportForm() {
  const [formData, setFormData] = useState<ImportFormData>({
    location: '',
    query: '',
    radius: 5000,
    minRating: 0,
    maxResults: 100,
    extractEmails: false,
    batchSize: 20,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  // ==========================================================================
  // FORM HANDLERS
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setJobId(null);
    setImportResult(null);

    // Validation
    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }

    if (formData.maxResults < 1 || formData.maxResults > 500) {
      setError('Max results must be between 1 and 500');
      return;
    }

    if (formData.batchSize < 5 || formData.batchSize > 50) {
      setError('Batch size must be between 5 and 50');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start import');
      }

      const data: ImportResponse = await response.json();

      setSuccess(true);
      setJobId(data.jobId);

    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start import');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ImportFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Import Form */}
      <Card>
        <CardHeader>
          <CardTitle>Import Leads from Google Maps</CardTitle>
          <CardDescription>
            Search and import business leads from Google Maps using our advanced scraper.
            Large requests are processed in batches to prevent server overload.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="San Francisco, CA"
                value={formData.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('location', e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                City, state, or specific address
              </p>
            </div>

            {/* Query (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="query">Business Type (Optional)</Label>
              <Input
                id="query"
                placeholder="coffee shops, restaurants, gyms..."
                value={formData.query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('query', e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to search for all businesses
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Radius */}
              <div className="space-y-2">
                <Label htmlFor="radius">Search Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="100"
                  max="50000"
                  step="100"
                  value={formData.radius}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('radius', parseInt(e.target.value))}
                  disabled={loading}
                />
              </div>

              {/* Min Rating */}
              <div className="space-y-2">
                <Label htmlFor="minRating">Minimum Rating</Label>
                <Select
                  value={formData.minRating.toString()}
                  onValueChange={(value: string) => handleInputChange('minRating', parseFloat(value))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any rating</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="3.5">3.5+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Max Results */}
              <div className="space-y-2">
                <Label htmlFor="maxResults">Max Results</Label>
                <Select
                  value={formData.maxResults.toString()}
                  onValueChange={(value: string) => handleInputChange('maxResults', parseInt(value))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 leads (fast)</SelectItem>
                    <SelectItem value="50">50 leads</SelectItem>
                    <SelectItem value="100">100 leads</SelectItem>
                    <SelectItem value="200">200 leads</SelectItem>
                    <SelectItem value="500">500 leads (slow)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Maximum 500 leads per request
                </p>
              </div>

              {/* Batch Size */}
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch Size</Label>
                <Select
                  value={formData.batchSize.toString()}
                  onValueChange={(value: string) => handleInputChange('batchSize', parseInt(value))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per batch</SelectItem>
                    <SelectItem value="20">20 per batch (default)</SelectItem>
                    <SelectItem value="30">30 per batch</SelectItem>
                    <SelectItem value="50">50 per batch</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Process in batches to prevent crashes
                </p>
              </div>
            </div>

            {/* Extract Emails */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="extractEmails"
                checked={formData.extractEmails}
                onCheckedChange={(checked: boolean) => handleInputChange('extractEmails', checked)}
                disabled={loading}
              />
              <Label htmlFor="extractEmails" className="cursor-pointer">
                Extract emails from websites (slower)
              </Label>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && jobId && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Import job started successfully! Processing in the background.
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={loading || success}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Import'
                )}
              </Button>

              {success && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSuccess(false);
                    setJobId(null);
                    setImportResult(null);
                  }}
                >
                  Start New Import
                </Button>
              )}
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Large requests (100+ leads) are processed in batches to ensure stability.
                You can track progress below while the job runs in the background.
              </AlertDescription>
            </Alert>
          </form>
        </CardContent>
      </Card>

      {/* Progress Component */}
      {jobId && (
        <LeadImportProgress
          jobId={jobId}
          onComplete={(result) => {
            setImportResult(result);
          }}
          onError={(error) => {
            setError(error);
            setSuccess(false);
          }}
        />
      )}

      {/* Final Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete!</CardTitle>
            <CardDescription>
              Your lead import has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Processed</p>
                <p className="text-2xl font-bold">{importResult.totalProcessed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Imported</p>
                <p className="text-2xl font-bold text-green-600">{importResult.totalImported}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Duplicates</p>
                <p className="text-2xl font-bold text-yellow-600">{importResult.totalDuplicates}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{importResult.totalErrors}</p>
              </div>
            </div>

            <div className="mt-6 flex space-x-2">
              <Button onClick={() => (window.location.href = '/leads')}>
                View Imported Leads
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  setJobId(null);
                  setImportResult(null);
                }}
              >
                Import More Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default LeadImportForm;
