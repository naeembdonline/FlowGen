// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - PHASE 2 INTEGRATION TESTS
// ============================================================================
// Comprehensive test suite for Phase 2: Lead Scraping Engine
// Run with: npm test
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { omkarcloudService } from '../omkarcloud.service';
import { leadService } from '../supabase.service';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111';

describe('Phase 2: Lead Scraping Engine', () => {

  beforeAll(async () => {
    // Setup test environment
    console.log('Setting up test environment...');

    // Verify Redis is running
    const { isRedisHealthy } = await import('../../config/redis');
    const redisHealthy = await isRedisHealthy();
    expect(redisHealthy).toBe(true);
    console.log('✓ Redis is healthy');

    // Verify database connection
    const { isDatabaseHealthy } = await import('../../config/database');
    const dbHealthy = await isDatabaseHealthy();
    expect(dbHealthy).toBe(true);
    console.log('✓ Database is healthy');
  });

  // ============================================================================
  // OMKARCLOUD SERVICE TESTS
  // ============================================================================

  describe('Omkarcloud Service', () => {

    it('should search for businesses successfully', async () => {
      const result = await omkarcloudService.searchBusinesses({
        location: 'San Francisco, CA',
        query: 'coffee shops',
        maxResults: 5,
      });

      expect(result).toBeDefined();
      expect(result.businesses).toBeInstanceOf(Array);
      expect(result.businesses.length).toBeGreaterThan(0);
      expect(result.totalFound).toBeGreaterThan(0);
      expect(result.searchLocation).toBe('San Francisco, CA');
      expect(result.searchQuery).toBe('coffee shops');

      console.log(`✓ Found ${result.businesses.length} coffee shops in San Francisco`);
    });

    it('should handle search without query (all businesses)', async () => {
      const result = await omkarcloudService.searchBusinesses({
        location: 'Austin, TX',
        maxResults: 3,
      });

      expect(result.businesses.length).toBeGreaterThan(0);
      expect(result.searchQuery).toBe('all');

      console.log(`✓ Found ${result.businesses.length} businesses in Austin (all categories)`);
    });

    it('should apply filters correctly', async () => {
      const result = await omkarcloudService.searchBusinesses({
        location: 'New York, NY',
        query: 'restaurants',
        minRating: 4.0,
        maxResults: 10,
      });

      // Check if all results meet the rating criteria
      const allHighRated = result.businesses.every(b =>
        !b.rating || b.rating >= 4.0
      );

      expect(allHighRated).toBe(true);

      console.log(`✓ All ${result.businesses.length} restaurants have 4+ rating`);
    });

    it('should use cache for repeated searches', async () => {
      const searchParams = {
        location: 'Miami, FL',
        query: 'gyms',
        maxResults: 5,
      };

      // First search should hit API
      const result1 = await omkarcloudService.searchBusinesses(searchParams, {
        useCache: true,
      });
      expect(result1.cached).toBe(false);

      // Second search should use cache
      const result2 = await omkarcloudService.searchBusinesses(searchParams, {
        useCache: true,
      });
      expect(result2.cached).toBe(true);

      console.log('✓ Caching works correctly');
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(5).fill(null).map((_, i) =>
        omkarcloudService.searchBusinesses({
          location: `City ${i}`,
          query: 'test',
        })
      );

      const results = await Promise.allSettled(requests);

      // At least some requests should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      console.log(`✓ Handled ${results.length} concurrent requests, ${successful.length} successful`);
    });

    it('should transform business data correctly', async () => {
      const result = await omkarcloudService.searchBusinesses({
        location: 'Seattle, WA',
        query: 'bookstores',
        maxResults: 1,
      });

      if (result.businesses.length > 0) {
        const business = result.businesses[0];

        expect(business.placeId).toBeDefined();
        expect(business.name).toBeDefined();
        expect(business.address).toBeDefined();

        console.log(`✓ Sample business: ${business.name} at ${business.address}`);
      }
    });
  });

  // ============================================================================
  // LEAD SERVICE TESTS
  // ============================================================================

  describe('Lead Service', () => {

    it('should fetch leads for tenant', async () => {
      const { leads, total } = await leadService.getByTenant(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
      });

      expect(leads).toBeInstanceOf(Array);
      expect(total).toBeGreaterThanOrEqual(0);

      console.log(`✓ Found ${total} leads for tenant`);
    });

    it('should filter leads by status', async () => {
      const { leads } = await leadService.getByTenant(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        status: 'new',
      });

      expect(leads).toBeInstanceOf(Array);
      const allNew = leads.every(lead => lead.status === 'new');
      expect(allNew).toBe(true);

      console.log(`✓ Found ${leads.length} leads with 'new' status`);
    });

    it('should search leads by keyword', async () => {
      const { leads } = await leadService.getByTenant(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        search: 'coffee',
      });

      expect(leads).toBeInstanceOf(Array);
      console.log(`✓ Found ${leads.length} leads matching 'coffee'`);
    });

    it('should create a new lead', async () => {
      const testLead = {
        name: 'Test Business',
        phone: '+1-555-0123',
        email: 'test@example.com',
        website: 'https://example.com',
        address: '123 Test St, Test City, TC',
        category: 'Test Category',
        google_maps_id: `test_${Date.now()}`,
      };

      const lead = await leadService.create(TEST_TENANT_ID, testLead);

      expect(lead).toBeDefined();
      expect(lead?.name).toBe('Test Business');

      console.log(`✓ Created test lead with ID: ${lead?.id}`);

      // Cleanup
      if (lead?.id) {
        await leadService.delete(lead.id);
        console.log('✓ Cleaned up test lead');
      }
    });

    it('should update a lead', async () => {
      // First create a lead
      const testLead = {
        name: 'Update Test Business',
        google_maps_id: `update_test_${Date.now()}`,
      };

      const created = await leadService.create(TEST_TENANT_ID, testLead);
      expect(created?.id).toBeDefined();

      if (created?.id) {
        // Update the lead
        const success = await leadService.update(created.id, {
          status: 'contacted',
        });

        expect(success).toBe(true);

        // Verify update
        const updated = await leadService.getById(created.id);
        expect(updated?.status).toBe('contacted');

        console.log(`✓ Updated lead status to 'contacted'`);

        // Cleanup
        await leadService.delete(created.id);
      }
    });

    it('should handle bulk import with duplicates', async () => {
      const testLeads = [
        {
          name: 'Bulk Test 1',
          google_maps_id: `bulk_test_1_${Date.now()}`,
          category: 'Test',
        },
        {
          name: 'Bulk Test 2',
          google_maps_id: `bulk_test_2_${Date.now()}`,
          category: 'Test',
        },
        {
          name: 'Bulk Test 3',
          google_maps_id: `bulk_test_3_${Date.now()}`,
          category: 'Test',
        },
      ];

      const result = await leadService.bulkImport(TEST_TENANT_ID, testLeads);

      expect(result.imported + result.duplicates).toBe(testLeads.length);
      expect(result.errors).toBe(0);

      console.log(`✓ Bulk imported: ${result.imported}, duplicates: ${result.duplicates}, errors: ${result.errors}`);

      // Cleanup
      for (const lead of testLeads) {
        // Find and delete the imported lead
        const { leads } = await leadService.getByTenant(TEST_TENANT_ID, {
          limit: 100,
        });

        const imported = leads.find(l => l.google_maps_id === lead.google_maps_id);
        if (imported?.id) {
          await leadService.delete(imported.id);
        }
      }
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {

    it('should complete full scraping and import workflow', async () => {
      // Step 1: Search for businesses
      console.log('\n--- Starting Full Workflow Test ---');

      const searchResult = await omkarcloudService.searchBusinesses({
        location: 'Portland, OR',
        query: 'coffee shops',
        maxResults: 3,
      });

      expect(searchResult.businesses.length).toBeGreaterThan(0);
      console.log(`Step 1: Found ${searchResult.businesses.length} businesses`);

      // Step 2: Transform to lead format
      const leadsToImport = searchResult.businesses.map(business => ({
        name: business.name,
        phone: business.phone,
        email: business.email,
        website: business.website,
        address: business.address,
        category: business.category,
        google_maps_id: business.placeId,
        google_rating: business.rating,
        google_reviews_count: business.reviewsCount,
      }));

      expect(leadsToImport.length).toBeGreaterThan(0);
      console.log(`Step 2: Transformed ${leadsToImport.length} businesses to leads`);

      // Step 3: Import to database
      const importResult = await leadService.bulkImport(TEST_TENANT_ID, leadsToImport);

      expect(importResult.imported).toBeGreaterThan(0);
      console.log(`Step 3: Imported ${importResult.imported} leads`);

      // Step 4: Verify import
      const { leads } = await leadService.getByTenant(TEST_TENANT_ID, {
        limit: 10,
      });

      const newLeads = leads.filter(l =>
        l.google_maps_id?.includes(searchResult.businesses[0].placeId)
      );

      expect(newLeads.length).toBeGreaterThan(0);
      console.log(`Step 4: Verified ${newLeads.length} leads in database`);

      // Cleanup
      for (const lead of leadsToImport) {
        const imported = leads.find(l => l.google_maps_id === lead.google_maps_id);
        if (imported?.id) {
          await leadService.delete(imported.id);
        }
      }
      console.log('Step 5: Cleaned up test data');

      console.log('\n--- Workflow Test Complete ---\n');
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid location
      const result = await omkarcloudService.searchBusinesses({
        location: '', // Invalid
        query: 'test',
      });

      // Should handle gracefully without throwing
      expect(result).toBeDefined();

      console.log('✓ Handled invalid location gracefully');
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Tests', () => {

    it('should handle concurrent search requests', async () => {
      const locations = [
        'San Francisco, CA',
        'Los Angeles, CA',
        'New York, NY',
      ];

      const startTime = Date.now();

      const results = await Promise.all(
        locations.map(location =>
          omkarcloudService.searchBusinesses({
            location,
            query: 'coffee',
            maxResults: 5,
          })
        )
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.businesses.length > 0)).toBe(true);

      console.log(`✓ Completed ${locations.length} concurrent searches in ${duration}ms`);
    });

    it('should respect cache performance', async () => {
      const searchParams = {
        location: 'Chicago, IL',
        query: 'restaurants',
        maxResults: 5,
      };

      // First call (uncached)
      const start1 = Date.now();
      await omkarcloudService.searchBusinesses(searchParams);
      const duration1 = Date.now() - start1;

      // Second call (cached)
      const start2 = Date.now();
      await omkarcloudService.searchBusinesses(searchParams);
      const duration2 = Date.now() - start2;

      // Cached call should be significantly faster
      expect(duration2).toBeLessThan(duration1);

      console.log(`✓ Cache performance: first call ${duration1}ms, cached call ${duration2}ms`);
    });
  });

  afterAll(async () => {
    console.log('\n=== All Tests Complete ===\n');
  });
});

// ============================================================================
// RUN INSTRUCTIONS
// ============================================================================
//
// To run these tests:
//
// 1. Ensure Redis and Database are running:
//    docker-compose up -d
//
// 2. Set up environment variables:
//    cp .env.example .env
//    # Add your API keys
//
// 3. Install dependencies:
//    npm install
//
// 4. Run tests:
//    npm test
//
// 5. Run specific test suite:
//    npm test -- phase2
//
// ============================================================================
