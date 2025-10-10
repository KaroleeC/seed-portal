/**
 * AI Service (OpenAI Implementation)
 *
 * This is the "doorway" file for our AI integration.
 * If we ever switch from OpenAI to another provider, we only need to rewrite this file.
 */

import OpenAI from "openai";
import { cache } from "../cache";
import { logger } from "../logger";
import type { ServiceHealthResult } from "./index";

export interface AIAnalysisResult {
  insights: string[];
  riskScore: number;
  recommendations: string[];
  confidence: number;
}

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export class AIService {
  private client: OpenAI | null = null;
  private readonly CACHE_TTL = {
    ANALYSIS: 60 * 60, // 1 hour
    GENERATION: 30 * 60, // 30 minutes
  };

  constructor() {
    const aiDisabled =
      process.env.DISABLE_AI === "1" || (process.env.DISABLE_AI || "").toLowerCase() === "true";
    if (aiDisabled) {
      logger.info("AI service disabled via DISABLE_AI flag");
      this.client = null;
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn("OPENAI_API_KEY not found; AI service will be unavailable");
      this.client = null;
      return;
    }

    this.client = new OpenAI({ apiKey });
  }

  /**
   * Stream a chat completion and invoke onDelta with content chunks as they arrive.
   */
  async streamChat(
    prompt: string,
    options: AIGenerationOptions & { onDelta: (delta: string) => void }
  ): Promise<void> {
    if (!this.client) {
      throw new Error(
        process.env.DISABLE_AI ? "AI disabled via DISABLE_AI" : "AI service unavailable"
      );
    }
    const { onDelta, model = "gpt-4o", maxTokens = 1200, temperature = 0.4 } = options;
    const client = this.client as OpenAI;
    try {
      const stream = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
        stream: true as any,
      } as any);

      // The OpenAI SDK returns an async iterable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of stream as any) {
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) {
          onDelta(delta);
        }
      }
    } catch (error: any) {
      logger.error("AI streamChat failed", { error: error?.message });
      throw error;
    }
  }

  async healthCheck(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    if (!this.client) {
      return {
        status: "degraded",
        message: process.env.DISABLE_AI ? "AI disabled via DISABLE_AI" : "OPENAI_API_KEY missing",
        responseTime: Date.now() - startTime,
      };
    }

    // Simple health check using models list (cheap call)
    try {
      await this.client.models.list();
      return { status: "healthy", responseTime: Date.now() - startTime };
    } catch (error: any) {
      logger.error("AI health check failed", { error: error.message });
      if (error.status === 429) {
        return { status: "degraded", message: "Rate limited" };
      }
      return {
        status: "unhealthy",
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  async analyzeClient(clientData: {
    companyName?: string;
    industry?: string;
    revenue?: string;
    employees?: number;
    description?: string;
  }): Promise<AIAnalysisResult> {
    const cacheKey = `ai:analysis:${this.hashData(clientData)}`;
    if (!this.client) {
      throw new Error(
        process.env.DISABLE_AI ? "AI disabled via DISABLE_AI" : "AI service unavailable"
      );
    }
    const client = this.client as OpenAI;

    try {
      // Check cache first
      const cached = await cache.get<AIAnalysisResult>(cacheKey);
      if (cached) {
        logger.debug("AI analysis cache hit", {
          companyName: clientData.companyName,
        });
        return cached as AIAnalysisResult;
      }

      logger.debug("AI client analysis", {
        companyName: clientData.companyName,
      });

      const prompt = `Analyze this business for financial services opportunities:
Company: ${clientData.companyName || "Unknown"}
Industry: ${clientData.industry || "Not specified"}
Revenue: ${clientData.revenue || "Not specified"}
Employees: ${clientData.employees || "Not specified"}
Description: ${clientData.description || "Not provided"}

Provide:
1. Key business insights and pain points
2. Risk assessment (0-100 scale)
3. Service recommendations
4. Confidence level (0-100)

Format as JSON with fields: insights (array), riskScore (number), recommendations (array), confidence (number)`;

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI service");
      }

      let result: AIAnalysisResult;
      try {
        result = JSON.parse(content);
      } catch {
        // Fallback if AI doesn't return valid JSON
        result = {
          insights: [`${content.slice(0, 200)}...`],
          riskScore: 50,
          recommendations: ["Review manually due to parsing error"],
          confidence: 30,
        };
      }

      // Cache the result
      await cache.set(cacheKey, result, this.CACHE_TTL.ANALYSIS);
      return result;
    } catch (error: any) {
      logger.error("AI client analysis failed", {
        companyName: clientData.companyName,
        error: error.message,
      });

      if (error.status === 429) {
        logger.warn("AI rate limit hit during analysis", {
          companyName: clientData.companyName,
        });
      }

      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async generateContent(prompt: string, options: AIGenerationOptions = {}): Promise<string> {
    const cacheKey = `ai:generation:${this.hashString(prompt)}`;
    if (!this.client) {
      throw new Error(
        process.env.DISABLE_AI ? "AI disabled via DISABLE_AI" : "AI service unavailable"
      );
    }

    try {
      // Check cache first
      const cached = await cache.get<string>(cacheKey);
      if (cached) {
        logger.debug("AI generation cache hit");
        return cached;
      }

      logger.debug("AI content generation", { promptLength: prompt.length });

      const response = await this.client.chat.completions.create({
        model: options.model || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI service");
      }

      // Cache the result
      await cache.set(cacheKey, content, this.CACHE_TTL.GENERATION);
      return content;
    } catch (error: any) {
      logger.error("AI content generation failed", { error: error.message });

      if (error.status === 429) {
        logger.warn("AI rate limit hit during generation");
      }

      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  private hashData(data: any): string {
    const str = JSON.stringify(data, Object.keys(data).sort());
    return this.hashString(str);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // Clear cache on data mutations
  async invalidateCache(pattern?: string): Promise<void> {
    try {
      const base = pattern ? `ai:${pattern}:` : "ai:";
      await cache.del(base);
      logger.debug("AI cache invalidated", { pattern });
    } catch (error: any) {
      logger.warn("AI cache invalidation failed", { error: error.message });
    }
  }
}
