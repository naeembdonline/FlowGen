// ============================================================================
// FIKERFLOW LEAD GENERATION SAAS - LEAD DATA TRANSFORMATION UTILITIES
// ============================================================================
// Utilities for transforming and validating lead data from various sources
// ============================================================================

import { GoogleMapsBusiness } from '../services/omkarcloud.service';
import { Lead } from '../services/supabase.service';
import { logger } from './logger';

// ============================================================================
// EMAIL EXTRACTION (from websites)
// ============================================================================

/**
 * Extract email addresses from website content
 * This is a simple implementation - you can enhance with more sophisticated scraping
 */
export function extractEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];

  // Filter out common non-business emails
  const filteredEmails = emails.filter(email =>
    !email.includes('@example.') &&
    !email.includes('@test.') &&
    !email.includes('@localhost') &&
    !email.includes('@sentry.') &&
    !email.includes('@wixpress.') // Common in Wix sites
  );

  // Remove duplicates
  return [...new Set(filteredEmails)];
}

/**
 * Extract email from a business object
 * Tries multiple fields and sources
 */
export function extractBusinessEmail(business: GoogleMapsBusiness): string | undefined {
  // Direct email field (if provided by API)
  if (business.email) {
    return business.email;
  }

  // Extract from description
  if (business.description) {
    const emails = extractEmailsFromText(business.description);
    if (emails.length > 0) {
      return emails[0];
    }
  }

  return undefined;
}

// ============================================================================
// PHONE NUMBER NORMALIZATION
// ============================================================================

/**
 * Normalize phone number to consistent format
 * Removes formatting, adds country code if needed
 */
export function normalizePhoneNumber(phone: string | undefined): string | undefined {
  if (!phone) return undefined;

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a valid length
  if (cleaned.length < 10 || cleaned.length > 15) {
    logger.warn(`Invalid phone number length: ${phone}`);
    return phone; // Return original if invalid
  }

  // Add US country code if needed (10 digit numbers)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Assume it already has country code
  return `+${cleaned}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// ============================================================================
// ADDRESS NORMALIZATION
// ============================================================================

/**
 * Parse and normalize address components
 */
export function parseAddress(address: string | undefined): {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
} {
  if (!address) return {};

  const parts = address.split(',').map(p => p.trim());
  const result: any = {};

  // Simple parsing logic - can be enhanced with a geocoding API
  if (parts.length >= 1) result.street = parts[0];
  if (parts.length >= 2) result.city = parts[1];
  if (parts.length >= 3) result.state = parts[2];
  if (parts.length >= 4) result.zipCode = parts[3];

  return result;
}

/**
 * Format city and state for display
 */
export function formatCityState(business: GoogleMapsBusiness): string {
  const parts = [];

  if (business.address) {
    const parsed = parseAddress(business.address);
    if (parsed.city) parts.push(parsed.city);
    if (parsed.state) parts.push(parsed.state);
  }

  return parts.join(', ') || 'Unknown';
}

// ============================================================================
// BUSINESS CATEGORY MAPPING
// ============================================================================

/**
 * Map Google Maps categories to standardized categories
 */
export function normalizeCategory(category: string | undefined): string | undefined {
  if (!category) return undefined;

  const categoryMap: Record<string, string> = {
    // Food & Dining
    'restaurant': 'Restaurant',
    'cafe': 'Coffee Shop',
    'coffee_shop': 'Coffee Shop',
    'bar': 'Bar',
    'pub': 'Bar',
    'bakery': 'Bakery',
    'food': 'Food & Dining',

    // Professional Services
    'lawyer': 'Legal Services',
    'attorney': 'Legal Services',
    'doctor': 'Healthcare',
    'dentist': 'Dental',
    'hospital': 'Healthcare',
    'clinic': 'Healthcare',
    'veterinary_care': 'Veterinary',
    'real_estate_agency': 'Real Estate',
    'insurance_agency': 'Insurance',
    'accounting': 'Accounting',
    'finance': 'Financial Services',

    // Home Services
    'plumber': 'Plumbing',
    'electrician': 'Electrical',
    'roofing_contractor': 'Roofing',
    'hvac': 'HVAC',
    'landscaping': 'Landscaping',
    'gardener': 'Landscaping',
    'car_repair': 'Automotive',
    'car_dealer': 'Automotive',
    'auto_parts': 'Automotive',

    // Retail
    'supermarket': 'Grocery',
    'grocery_store': 'Grocery',
    'clothing_store': 'Retail',
    'shoe_store': 'Retail',
    'electronics_store': 'Retail',
    'furniture_store': 'Retail',

    // Beauty & Wellness
    'hair_salon': 'Beauty',
    'beauty_salon': 'Beauty',
    'spa': 'Beauty',
    'gym': 'Gym',
    'weight_loss_center': 'Health & Wellness',

    // Technology
    'computer_repair_service': 'IT Services',
    'software_company': 'Technology',
    'telecommunications': 'Technology',
  };

  // Convert to lowercase and remove underscores/spaces
  const normalizedKey = category.toLowerCase().replace(/[\s_]/g, '_');

  return categoryMap[normalizedKey] || category;
}

// ============================================================================
// DATA ENRICHMENT
// ============================================================================

/**
 * Enrich business data with additional computed fields
 */
export function enrichBusinessData(business: GoogleMapsBusiness): GoogleMapsBusiness {
  return {
    ...business,
    // Add normalized category
    category: normalizeCategory(business.category),

    // Add extracted email
    email: extractBusinessEmail(business),

    // Add parsed location
    city: formatCityState(business),

    // Add normalized phone
    phone: normalizePhoneNumber(business.phone),

    // Add quality score based on available data
    // This helps prioritize leads
    qualityScore: calculateQualityScore(business),
  };
}

/**
 * Calculate lead quality score (0-100)
 * Higher score = more likely to be a good lead
 */
export function calculateQualityScore(business: GoogleMapsBusiness): number {
  let score = 50; // Base score

  // Has phone number
  if (business.phone) score += 10;

  // Has website
  if (business.website) score += 10;

  // Has email
  if (business.email) score += 15;

  // Has good rating (4+)
  if (business.rating && business.rating >= 4.0) score += 10;

  // Has many reviews (50+)
  if (business.reviewsCount && business.reviewsCount >= 50) score += 5;

  // Verified business
  if (business.verified) score += 5;

  // Has description
  if (business.description && business.description.length > 50) score += 5;

  return Math.min(score, 100);
}

// ============================================================================
// GOOGLE MAPS URL GENERATION
// ============================================================================

/**
 * Generate Google Maps URL from place ID
 */
export function generateGoogleMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}

/**
 * Generate Google Maps search URL
 */
export function generateGoogleMapsSearchUrl(location: string, query?: string): string {
  const searchQuery = query ? `${query} in ${location}` : location;
  return `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/`;
}

// ============================================================================
// LEAD VALIDATION
// ============================================================================

/**
 * Validate lead data before import
 */
export function validateLeadData(lead: Partial<Lead>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!lead.name || lead.name.trim().length === 0) {
    errors.push('Name is required');
  }

  // Validate phone format if provided
  if (lead.phone && !isValidPhoneNumber(lead.phone)) {
    errors.push('Invalid phone number format');
  }

  // Validate email format if provided
  if (lead.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      errors.push('Invalid email format');
    }
  }

  // Validate URL format if provided
  if (lead.website) {
    try {
      new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`);
    } catch {
      errors.push('Invalid website URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// BATCH PROCESSING UTILITIES
// ============================================================================

/**
 * Split array into chunks for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process array with concurrency limit
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const chunks = chunkArray(items, concurrency);
  const results: R[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  extractEmailsFromText,
  extractBusinessEmail,
  normalizePhoneNumber,
  isValidPhoneNumber,
  parseAddress,
  formatCityState,
  normalizeCategory,
  enrichBusinessData,
  calculateQualityScore,
  generateGoogleMapsUrl,
  generateGoogleMapsSearchUrl,
  validateLeadData,
  chunkArray,
  processBatch,
};
