// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - AI PERSONALIZATION SERVICE
// ============================================================================
// Generates personalized outreach messages using Z.ai (primary) or OpenAI (fallback)
// Optimized for Fikerflow agency outreach campaigns
// ============================================================================

import { logger } from '../utils/logger';
import { GeneratedLead } from './leadGeneration.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PersonalizationRequest {
  lead: GeneratedLead;
  campaignType?: 'cold-outreach' | 'follow-up' | 'promotional' | 'partnership';
  agencyName?: string;
  agencyServices?: string[];
  tone?: 'professional' | 'casual' | 'friendly' | 'urgent';
  customInstructions?: string;
}

export interface PersonalizedMessage {
  leadId: string;
  leadName: string;
  personalizedSubject: string;
  personalizedMessage: string;
  channel: 'email' | 'whatsapp';
  characterCount: number;
  wordCount: number;
  aiProvider: 'z.ai' | 'openai' | 'fallback';
  generatedAt: string;
}

export interface AIProviderResponse {
  content: string;
  provider: 'z.ai' | 'openai';
  success: boolean;
  error?: string;
  tokensUsed?: number;
}

// ============================================================================
// AI PERSONALIZATION SERVICE
// ============================================================================

class AIPersonalizationService {
  private zaiApiKey: string;
  private openaiApiKey: string;
  private agencyName: string = 'Fikerflow';
  private defaultServices: string[] = [
    'Web Development',
    'Mobile Applications',
    'Digital Marketing',
    'Brand Strategy',
    'UI/UX Design'
  ];

  constructor() {
    this.zaiApiKey = process.env.Z_AI_API_KEY || '';
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  /**
   * Generate personalized message for a lead
   */
  async generatePersonalizedMessage(request: PersonalizationRequest): Promise<PersonalizedMessage> {
    try {
      logger.info(`Generating personalized message for ${request.lead.name}`);

      // Try Z.ai first, then fall back to OpenAI
      const aiResponse = await this.tryZAI(request) ||
                        await this.tryOpenAI(request) ||
                        this.generateFallbackMessage(request);

      // Split into subject and message
      const { subject, message } = this.splitSubjectAndMessage(aiResponse.content, request);

      const result: PersonalizedMessage = {
        leadId: request.lead.id,
        leadName: request.lead.name,
        personalizedSubject: subject,
        personalizedMessage: message,
        channel: this.determineChannel(request),
        characterCount: message.length,
        wordCount: message.split(/\s+/).length,
        aiProvider: aiResponse.provider,
        generatedAt: new Date().toISOString(),
      };

      logger.info(`Generated personalized message for ${request.lead.name}`, {
        provider: aiResponse.provider,
        channel: result.channel,
        wordCount: result.wordCount,
      });

      return result;

    } catch (error) {
      logger.error(`Failed to generate personalized message for ${request.lead.name}:`, error);
      throw new Error(`AI personalization failed: ${error.message}`);
    }
  }

  /**
   * Try Z.ai for message generation
   */
  private async tryZAI(request: PersonalizationRequest): Promise<AIProviderResponse | null> {
    if (!this.zaiApiKey) {
      logger.debug('Z.ai API key not configured');
      return null;
    }

    try {
      const prompt = this.buildPrompt(request);

      const response = await fetch('https://api.z.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.zaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'zai-1.5',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Z.ai API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        provider: 'z.ai',
        success: true,
        tokensUsed: data.usage?.total_tokens,
      };

    } catch (error) {
      logger.warn('Z.ai generation failed, trying OpenAI:', error.message);
      return null;
    }
  }

  /**
   * Try OpenAI for message generation
   */
  private async tryOpenAI(request: PersonalizationRequest): Promise<AIProviderResponse | null> {
    if (!this.openaiApiKey) {
      logger.debug('OpenAI API key not configured');
      return null;
    }

    try {
      const prompt = this.buildPrompt(request);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        provider: 'openai',
        success: true,
        tokensUsed: data.usage?.total_tokens,
      };

    } catch (error) {
      logger.warn('OpenAI generation failed, using fallback:', error.message);
      return null;
    }
  }

  /**
   * Generate fallback message (template-based)
   */
  private generateFallbackMessage(request: PersonalizationRequest): AIProviderResponse {
    const lead = request.lead;
    const agencyName = request.agencyName || this.agencyName;

    const fallbackTemplates = {
      'cold-outreach': `Hi ${lead.name.split(' ')[0]},\n\nI came across ${lead.name} and was impressed by what you're doing in ${lead.category || 'your industry'}. I'm with ${agencyName}, and we specialize in helping businesses like yours scale their digital presence.\n\nWould you be open to a quick call to discuss how we've helped similar businesses achieve significant growth?\n\nBest regards`,
      'follow-up': `Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up on my previous message. I've been looking at ${lead.name} and have some specific ideas that could really help with your growth.\n\nAre you available for a 15-minute call this week?\n\nBest regards`,
      'promotional': `Hey ${lead.name.split(' ')[0]},\n\nQuick question - are you currently happy with your website's performance? We've been helping businesses in ${lead.city || 'your area'} improve their online presence significantly.\n\nNo pressure, just wanted to share some insights. Let me know if you're interested!\n\nBest regards`,
      'partnership': `Hi ${lead.name.split(' ')[0]},\n\nI've been following ${lead.name} for a while and think there could be some great synergy between our businesses. I'm with ${agencyName}, and we specialize in ${this.defaultServices.slice(0, 3).join(', ')}.\n\nWould you be open to exploring potential collaboration opportunities?\n\nBest regards`,
    };

    const template = fallbackTemplates[request.campaignType] || fallbackTemplates['cold-outreach'];

    return {
      content: template,
      provider: 'fallback',
      success: true,
    };
  }

  /**
   * Build the AI prompt
   */
  private buildPrompt(request: PersonalizationRequest): string {
    const lead = request.lead;
    const agencyName = request.agencyName || this.agencyName;
    const services = request.agencyServices || this.defaultServices;
    const tone = request.tone || 'professional';

    let prompt = `Create a personalized ${request.campaignType || 'cold-outreach'} message for:\n\n`;
    prompt += `BUSINESS DETAILS:\n`;
    prompt += `- Name: ${lead.name}\n`;
    prompt += `- Category: ${lead.category || 'General'}\n`;
    prompt += `- Location: ${lead.city || 'Unknown'}\n`;
    if (lead.rating) prompt += `- Rating: ${lead.rating}/5\n`;
    if (lead.website) prompt += `- Website: ${lead.website}\n`;

    prompt += `\nOUR AGENCY:\n`;
    prompt += `- Name: ${agencyName}\n`;
    prompt += `- Services: ${services.join(', ')}\n`;
    prompt += `- Tone: ${tone}\n`;

    if (request.customInstructions) {
      prompt += `\nSPECIAL INSTRUCTIONS: ${request.customInstructions}\n`;
    }

    prompt += `\nGenerate a ${tone} message that:\n`;
    prompt += `1. Is personalized to their business\n`;
    prompt += `2. Mentions specific details about their industry\n`;
    prompt += `3. Highlights relevant services we offer\n`;
    prompt += `4. Includes a clear call-to-action\n`;
    prompt += `5. Is under 150 words\n`;
    prompt += `6. Starts with an appropriate subject line (format: Subject: [line])\n`;

    return prompt;
  }

  /**
   * Get system prompt for AI
   */
  private getSystemPrompt(): string {
    return `You are an expert outreach specialist for Fikerflow, a digital agency specializing in web development, mobile apps, and digital marketing.

Your task is to generate personalized, engaging outreach messages that:
- Feel authentic and personalized
- Show genuine interest in the recipient's business
- Highlight relevant services without being overly promotional
- Include a clear but not pushy call-to-action
- Maintain professional yet friendly tone
- Are concise (under 150 words)
- Start with an appropriate subject line

Format your response as plain text with the subject line on the first line starting with "Subject: ".`;
  }

  /**
   * Split response into subject and message
   */
  private splitSubjectAndMessage(content: string, request: PersonalizationRequest): {
    subject: string;
    message: string;
  } {
    const lines = content.split('\n').map(line => line.trim());

    let subject = '';
    let message = '';

    // Extract subject line
    const subjectLineIndex = lines.findIndex(line =>
      line.toLowerCase().startsWith('subject:')
    );

    if (subjectLineIndex !== -1) {
      subject = lines[subjectLineIndex].replace(/^subject:\s*/i, '');
      message = lines.slice(subjectLineIndex + 1).join('\n').trim();
    } else {
      // Generate default subject if none found
      const subjects = {
        'cold-outreach': `Growing ${request.lead.name}'s Online Presence`,
        'follow-up': `Following Up - ${request.lead.name}`,
        'promotional': `Quick Question for ${request.lead.name}`,
        'partnership': `Partnership Opportunity with ${request.lead.name}`,
      };
      subject = subjects[request.campaignType] || `Hello from ${this.agencyName}`;
      message = content.trim();
    }

    // Clean up the message
    message = message
      .replace(/^subject:.*$/im, '') // Remove any remaining subject lines
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/\n+$/, '') // Remove trailing newlines
      .trim();

    return { subject, message };
  }

  /**
   * Determine best channel for this lead
   */
  private determineChannel(request: PersonalizationRequest): 'email' | 'whatsapp' {
    // If lead has email, prefer email for longer messages
    if (request.lead.email) {
      return 'email';
    }
    // If lead has phone, use WhatsApp
    if (request.lead.phone) {
      return 'whatsapp';
    }
    // Default to email
    return 'email';
  }

  /**
   * Batch generate messages for multiple leads
   */
  async generateBatchMessages(
    leads: GeneratedLead[],
    options: Omit<PersonalizationRequest, 'lead'>
  ): Promise<PersonalizedMessage[]> {
    const results: PersonalizedMessage[] = [];

    for (const lead of leads) {
      try {
        const message = await this.generatePersonalizedMessage({
          ...options,
          lead,
        });
        results.push(message);

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        logger.error(`Failed to generate message for ${lead.name}:`, error);
        // Continue with next lead
      }
    }

    return results;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const aiPersonalizationService = new AIPersonalizationService();

export default aiPersonalizationService;
