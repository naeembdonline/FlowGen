// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - REAL-TIME IMPORT DASHBOARD
// ============================================================================
// Live lead generation dashboard with real-time updates and AI personalization
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Play, RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2, Database, Sparkles, MessageSquare } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface LeadGenerationRequest {
  keyword: string;
  location: string;
  maxResults: number;
  minRating: number;
  radius: number;
  extractEmails: boolean;
}

interface ScrapedLead {
  placeId: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  category?: string;
  rating?: number;
}

interface JobProgress {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalFound: number;
  totalImported: number;
  totalDuplicates: number;
  totalErrors: number;
  currentBatch: number;
  totalBatches: number;
  leads: ScrapedLead[];
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

interface PersonalizedMessage {
  leadId: string;
  leadName: string;
  personalizedSubject: string;
  personalizedMessage: string;
  channel: 'email' | 'whatsapp';
  aiProvider: 'z.ai' | 'openai' | 'fallback';
  generatedAt: string;
  wordCount?: number;
  characterCount?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RealTimeImportPage() {
  const [formData, setFormData] = useState<LeadGenerationRequest>({
    keyword: '',
    location: '',
    maxResults: 50,
    minRating: 0,
    radius: 5000,
    extractEmails: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scrape' | 'leads' | 'messages'>('scrape');

  // Job progress state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);

  // Personalized messages state
  const [personalizedMessages, setPersonalizedMessages] = useState<PersonalizedMessage[]>([]);
  const [personalizingLead, setPersonalizingLead] = useState<string | null>(null);

  // ==========================================================================
  // LEAD GENERATION
  // ==========================================================================

  const startLeadGeneration = async () => {
    if (!formData.keyword.trim() || !formData.location.trim()) {
      setError('Keyword and location are required');
      return;
    }

    setLoading(true);
    setError(null);
    setJobId(null);
    setJobProgress(null);
    setPersonalizedMessages([]);

    try {
      const response = await fetch('/api/v1/campaigns/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start lead generation');
      }

      const data = await response.json();
      setJobId(data.jobId);

      // Start polling for progress
      pollJobProgress(data.jobId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start lead generation');
    } finally {
      setLoading(false);
    }
  };

  const pollJobProgress = async (currentJobId: string) => {
    try {
      const response = await fetch(`/api/v1/campaigns/scrape/progress/${currentJobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job progress');
      }

      const progress: JobProgress = await response.json();
      setJobProgress(progress);

      // Continue polling if job is still processing
      if (progress.status === 'processing' || progress.status === 'queued') {
        setTimeout(() => pollJobProgress(currentJobId), 2000); // Poll every 2 seconds
      }

      // Auto-switch to leads tab when job completes
      if (progress.status === 'completed' && progress.leads.length > 0) {
        setActiveTab('leads');
      }

    } catch (err) {
      console.error('Failed to fetch job progress:', err);
      // Retry once more after delay
      setTimeout(() => pollJobProgress(currentJobId), 5000);
    }
  };

  // ==========================================================================
  // AI PERSONALIZATION
  // ==========================================================================

  const generatePersonalizedMessage = async (lead: ScrapedLead) => {
    setPersonalizingLead(lead.placeId);

    try {
      const response = await fetch('/api/v1/campaigns/personalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead: {
            id: lead.placeId,
            name: lead.name,
            category: lead.category,
            city: lead.address?.split(',')[1]?.trim(),
            website: lead.website,
          },
          campaignType: 'cold-outreach',
          agencyName: 'Fikerflow',
          agencyServices: ['Web Development', 'Mobile Applications', 'Digital Marketing', 'Brand Strategy', 'UI/UX Design'],
          tone: 'professional',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate personalized message');
      }

      const data = await response.json();
      setPersonalizedMessages(prev => [data.data, ...prev]);

    } catch (err) {
      console.error('Failed to generate message:', err);
    } finally {
      setPersonalizingLead(null);
    }
  };

  const generateAllMessages = async () => {
    if (!jobProgress?.leads.length) return;

    const leads = jobProgress.leads.slice(0, 5); // Limit to 5 for demo

    try {
      const response = await fetch('/api/v1/campaigns/personalize/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: leads.map(lead => ({
            id: lead.placeId,
            name: lead.name,
            category: lead.category,
            city: lead.address?.split(',')[1]?.trim(),
            website: lead.website,
          })),
          options: {
            campaignType: 'cold-outreach',
            agencyName: 'Fikerflow',
            agencyServices: ['Web Development', 'Mobile Applications', 'Digital Marketing', 'Brand Strategy', 'UI/UX Design'],
            tone: 'professional',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate messages');
      }

      const data = await response.json();
      setPersonalizedMessages(data.data);

    } catch (err) {
      console.error('Failed to generate batch messages:', err);
    }
  };

  // ==========================================================================
  // RENDER FUNCTIONS
  // ==========================================================================

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Queued</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 text-white">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAIProviderBadge = (provider: string) => {
    switch (provider) {
      case 'z.ai':
        return <Badge className="bg-purple-500 text-white">Z.ai</Badge>;
      case 'openai':
        return <Badge className="bg-green-500 text-white">OpenAI</Badge>;
      case 'fallback':
        return <Badge variant="outline">Template</Badge>;
      default:
        return <Badge variant="outline">{provider}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Real-Time Lead Generation
        </h1>
        <p className="text-lg text-gray-600">
          Scrape Google Maps and generate AI-powered personalized messages in real-time
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="scrape" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Scrape Leads
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Import Results ({jobProgress?.leads.length || 0})
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Messages ({personalizedMessages.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SCRAPE FORM */}
        <TabsContent value="scrape">
          <Card>
            <CardHeader>
              <CardTitle>Start Lead Generation</CardTitle>
              <CardDescription>
                Enter keyword and location to start scraping Google Maps for business leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="keyword">Keyword *</Label>
                    <Input
                      id="keyword"
                      placeholder="e.g., coffee shops, restaurants, gyms"
                      value={formData.keyword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, keyword: e.target.value})}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., San Francisco, CA"
                      value={formData.location}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, location: e.target.value})}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxResults">Max Results</Label>
                    <Select
                      value={formData.maxResults.toString()}
                      onValueChange={(value: string) => setFormData({...formData, maxResults: parseInt(value)})}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20 leads</SelectItem>
                        <SelectItem value="50">50 leads</SelectItem>
                        <SelectItem value="100">100 leads</SelectItem>
                        <SelectItem value="200">200 leads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minRating">Minimum Rating</Label>
                    <Select
                      value={formData.minRating.toString()}
                      onValueChange={(value: string) => setFormData({...formData, minRating: parseFloat(value)})}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any rating</SelectItem>
                        <SelectItem value="3">3+ stars</SelectItem>
                        <SelectItem value="4">4+ stars</SelectItem>
                        <SelectItem value="4.5">4.5+ stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="radius">Search Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min="100"
                      max="50000"
                      step="100"
                      value={formData.radius}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, radius: parseInt(e.target.value)})}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extractEmails">Advanced Options</Label>
                    <div className="flex items-center space-x-2 h-10">
                      <Checkbox
                        id="extractEmails"
                        checked={formData.extractEmails}
                        onCheckedChange={(checked: boolean) => setFormData({...formData, extractEmails: checked})}
                        disabled={loading}
                      />
                      <Label htmlFor="extractEmails" className="cursor-pointer">
                        Extract emails (slower)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Progress Display */}
                {jobProgress && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(jobProgress.status)}
                        {jobProgress.status === 'processing' && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {jobProgress.progress}% complete
                      </span>
                    </div>

                    <Progress value={jobProgress.progress} className="h-2" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Found</div>
                        <div className="font-semibold text-lg">{jobProgress.totalFound}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Imported</div>
                        <div className="font-semibold text-lg text-green-600">{jobProgress.totalImported}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Duplicates</div>
                        <div className="font-semibold text-lg text-yellow-600">{jobProgress.totalDuplicates}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Errors</div>
                        <div className="font-semibold text-lg text-red-600">{jobProgress.totalErrors}</div>
                      </div>
                    </div>

                    {jobProgress.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-2">Errors encountered:</div>
                          <ul className="list-disc list-inside text-sm">
                            {jobProgress.errors.slice(0, 3).map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                            {jobProgress.errors.length > 3 && (
                              <li>...and {jobProgress.errors.length - 3} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={startLeadGeneration}
                  disabled={loading || (jobProgress?.status === 'processing')}
                  size="lg"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Lead Generation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: IMPORT RESULTS */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>
                {jobProgress?.leads.length || 0} leads found and imported to database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!jobProgress || jobProgress.leads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leads imported yet. Start a lead generation job to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobProgress.leads.map((lead, index) => (
                    <div key={lead.placeId} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{lead.name}</h3>
                            {lead.rating && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                ⭐ {lead.rating}
                              </Badge>
                            )}
                            {lead.category && (
                              <Badge variant="outline">{lead.category}</Badge>
                            )}
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            {lead.address && (
                              <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span>{lead.address}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-2">
                                <span>📞</span>
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            {lead.website && (
                              <div className="flex items-center gap-2">
                                <span>🌐</span>
                                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {lead.website}
                                </a>
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-2">
                                <span>✉️</span>
                                <span>{lead.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generatePersonalizedMessage(lead)}
                          disabled={personalizingLead === lead.placeId}
                        >
                          {personalizingLead === lead.placeId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI Message
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: AI MESSAGES */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Personalized Messages</CardTitle>
                  <CardDescription>
                    {personalizedMessages.length} messages generated using AI
                  </CardDescription>
                </div>
                {jobProgress && jobProgress.leads.length > 0 && personalizedMessages.length === 0 && (
                  <Button onClick={generateAllMessages} variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate All Messages
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {personalizedMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No AI messages generated yet. Generate individual messages from the Leads tab.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {personalizedMessages.map((msg, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{msg.leadName}</h3>
                          <p className="text-sm text-gray-600">
                            {msg.channel === 'email' ? '📧 Email' : '📱 WhatsApp'}
                          </p>
                        </div>
                        {getAIProviderBadge(msg.aiProvider)}
                      </div>

                      <div className="bg-gray-50 rounded p-3 space-y-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Subject:</div>
                          <div className="text-sm font-medium">{msg.personalizedSubject}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Message:</div>
                          <div className="text-sm whitespace-pre-wrap">{msg.personalizedMessage}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{msg.wordCount} words</span>
                        <span>{msg.characterCount} characters</span>
                        <span>{new Date(msg.generatedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
