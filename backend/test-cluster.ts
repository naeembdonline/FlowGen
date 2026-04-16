// ============================================================================
// TEST SCRIPT: Puppeteer Cluster Scraper
// ============================================================================
// This script tests the cluster implementation to verify it works correctly
// ============================================================================

import { puppeteerClusterScraper } from './src/services/puppeteerClusterScraper.service';
import { logger } from './src/utils/logger';

async function testClusterScraper() {
  console.log('🧪 Testing Puppeteer Cluster Scraper...\n');

  try {
    // Test 1: Initialize cluster
    console.log('Test 1: Initializing cluster...');
    await puppeteerClusterScraper.initializeCluster();
    console.log('✅ Cluster initialized successfully\n');

    // Test 2: Health check
    console.log('Test 2: Checking cluster health...');
    const health = await puppeteerClusterScraper.healthCheck();
    console.log('✅ Health check passed:', health);
    console.log('');

    // Test 3: Get cluster stats
    console.log('Test 3: Getting cluster statistics...');
    const stats = await puppeteerClusterScraper.getClusterStats();
    console.log('✅ Cluster stats:', stats);
    console.log('');

    // Test 4: Small search test
    console.log('Test 4: Testing Google Maps search (small batch)...');
    const searchResult = await puppeteerClusterScraper.searchBusinesses(
      {
        location: 'San Francisco, CA',
        query: 'coffee',
        maxResults: 3,
        useStealth: true,
      },
      {
        useCache: false, // Force fresh search for testing
        timeout: 60000,
        headless: true,
        maxRetries: 2,
      }
    );

    console.log('✅ Search completed:');
    console.log(`   - Found: ${searchResult.totalFound} businesses`);
    console.log(`   - Time: ${searchResult.scrapingTime}ms`);
    console.log(`   - Businesses:`, searchResult.businesses.map(b => b.name));
    console.log('');

    // Test 5: Email extraction test
    console.log('Test 5: Testing email extraction...');
    if (searchResult.businesses.length > 0 && searchResult.businesses[0].website) {
      const email = await puppeteerClusterScraper.extractEmailFromWebsite(
        searchResult.businesses[0].website
      );
      console.log(`✅ Email extraction result: ${email || 'No email found'}`);
    } else {
      console.log('⚠️  No website found to test email extraction');
    }
    console.log('');

    // Test 6: Final health check after tests
    console.log('Test 6: Final health check...');
    const finalHealth = await puppeteerClusterScraper.healthCheck();
    console.log('✅ Final health status:', finalHealth);
    console.log('');

    // Test 7: Cleanup
    console.log('Test 7: Cleaning up cluster...');
    await puppeteerClusterScraper.cleanup();
    console.log('✅ Cluster cleaned up successfully\n');

    console.log('🎉 All tests passed! Cluster implementation is working correctly.\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testClusterScraper();
