// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - DASHBOARD PAGE
// ============================================================================
// This is the main dashboard page after user logs in.
// It displays key metrics and navigation to different sections.
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUserName } from '@/stores/useAuthStore';
import { useLeadStore } from '@/stores/useLeadStore';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const userName = useUserName();
  const { leads, isLoading: leadsLoading, fetchLeads } = useLeadStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch leads on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
    }
  }, [isAuthenticated, fetchLeads]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-600">FlowGen</h1>
              <div className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-gray-900 dark:text-white font-medium">
                  Dashboard
                </a>
                <a href="/leads" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Leads
                </a>
                <a href="/campaigns" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Campaigns
                </a>
                <a href="/analytics" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Analytics
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">
                {userName || 'User'}
              </span>
              <button
                onClick={() => {
                  useAuthStore.getState().logout();
                  router.push('/login');
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {userName}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening with your lead generation today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Leads</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {leads.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Active Campaigns</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              0
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Messages Sent</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              0
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Response Rate</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              0%
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Import Leads
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Search Google Maps and import business leads to your database.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Import Leads (Coming Soon)
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create Campaign
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Launch an automated outreach campaign via WhatsApp or Email.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Create Campaign (Coming Soon)
            </button>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Leads
            </h3>
            <a href="/leads" className="text-blue-600 hover:text-blue-700">
              View All
            </a>
          </div>

          {leadsLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No leads yet. Import your first leads to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                      Date Added
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 5).map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {lead.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {lead.category || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          lead.status === 'new'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
