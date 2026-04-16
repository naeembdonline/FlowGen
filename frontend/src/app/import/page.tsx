// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - IMPORT PAGE
// ============================================================================
// This is the import page where users can search and import leads
// Features queue-based processing with real-time progress tracking
// ============================================================================

import { Metadata } from 'next';
import LeadImportForm from '@/components/LeadImportForm';

export const metadata: Metadata = {
  title: 'Import Leads - Fikerflow',
  description: 'Import leads from Google Maps using our advanced scraper',
};

export default function ImportPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Import Leads
        </h1>
        <p className="text-lg text-gray-600">
          Search and import business leads from Google Maps using our advanced scraper.
          Large requests are processed in batches to ensure stability.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🚀 Fast Processing</h3>
          <p className="text-sm text-blue-700">
            Import up to 500 leads in batches without waiting. Process in the background while you work.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-2">📊 Real-Time Progress</h3>
          <p className="text-sm text-green-700">
            Track your import progress with live updates. See exactly how many leads have been imported.
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-2">🔒 Stable & Reliable</h3>
          <p className="text-sm text-purple-700">
            Queue-based processing prevents crashes. Automatic retry logic handles temporary failures.
          </p>
        </div>
      </div>

      {/* Import Form */}
      <LeadImportForm />

      {/* How It Works */}
      <div className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Search</h3>
            <p className="text-sm text-gray-600">
              Enter location and business type to search Google Maps
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Queue</h3>
            <p className="text-sm text-gray-600">
              Your request is added to the queue and processed in batches
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Track</h3>
            <p className="text-sm text-gray-600">
              Watch real-time progress as leads are imported
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              4
            </div>
            <h3 className="font-semibold mb-2">Export</h3>
            <p className="text-sm text-gray-600">
              View and export your imported leads to CSV
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-3">💡 Tips for Best Results</h3>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li>✅ Use specific locations (e.g., "San Francisco, CA" instead of "California")</li>
          <li>✅ Start with smaller requests (20-100 leads) for faster results</li>
          <li>✅ Use business type to narrow down results (e.g., "coffee shops" instead of "all")</li>
          <li>✅ Enable email extraction only when needed (adds 2-3x processing time)</li>
          <li>✅ Set minimum rating to 4+ for high-quality businesses</li>
          <li>✅ Use batch size of 20 for balanced performance</li>
        </ul>
      </div>
    </div>
  );
}
