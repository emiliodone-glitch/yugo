import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { ModerationResult } from '@yugo/shared';
import { SettingsService } from '../../common/settings.service';

export interface TextClassifier {
  classify(text: string, context: string): Promise<{ risk: number; categories: string[] }>;
}

/**
 * Anthropic-based classifier (RF-SEG-02, RF-CON-06). The prompt asks for a
 * strict JSON verdict; model configurable via MODERATION_TEXT_MODEL.
 */
class AnthropicClassifier implements TextClassifier {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  private readonly model = process.env.MODERATION_TEXT_MODEL ?? 'claude-haiku-4-5-20251001';

  async classify(text: string, context: string): Promise<{ risk: number; categories: string[] }> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 200,
      system: [
        'You are the content-safety classifier for Yugo, a Christian dating and community app.',
        'Classify the user text for covenant violations. Categories:',
        'sexual, offensive, harassment, scam_or_money (asking for money, investments, moving to other apps early), spam_commercial, proselytism_pressure, minor_safety, doctrinal_attack.',
        'Reply with ONLY a JSON object: {"risk": <0..1>, "categories": [<matching category slugs>]}.',
        'risk reflects the probability the content violates the covenant; normal romantic/faith conversation is low risk.',
      ].join('\n'),
      messages: [{ role: 'user', content: `Context: ${context}\nText:\n${text}` }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const raw = block && 'text' in block ? block.text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : '{}') as { risk?: number; categories?: string[] };
    return {
      risk: Math.min(1, Math.max(0, Number(parsed.risk ?? 0))),
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  }
}

/**
 * Deterministic dev/test stub: keyword heuristics that mimic the categories.
 * Used when ANTHROPIC_API_KEY is not configured.
 */
export class StubClassifier implements TextClassifier {
  private static RULES: Array<{ pattern: RegExp; risk: number; category: string }> = [
    { pattern: /\b(dinero|préstamo|deposita|transferencia|invers|western union|paypal)\b/i, risk: 0.95, category: 'scam_or_money' },
    { pattern: /\b(whatsapp|telegram|instagram)\b/i, risk: 0.75, category: 'scam_or_money' },
    { pattern: /\b(sexo|sexual|desnud|sensual)\b/i, risk: 0.93, category: 'sexual' },
    { pattern: /\b(estúpid|idiota|imbécil|maldit)\b/i, risk: 0.8, category: 'offensive' },
  ];

  async classify(text: string): Promise<{ risk: number; categories: string[] }> {
    let risk = 0.02;
    const categories: string[] = [];
    for (const rule of StubClassifier.RULES) {
      if (rule.pattern.test(text)) {
        risk = Math.max(risk, rule.risk);
        categories.push(rule.category);
      }
    }
    return { risk, categories };
  }
}

@Injectable()
export class TextModerationService {
  private readonly logger = new Logger(TextModerationService.name);
  private readonly classifier: TextClassifier;

  constructor(private readonly settings: SettingsService) {
    this.classifier = process.env.ANTHROPIC_API_KEY
      ? new AnthropicClassifier()
      : new StubClassifier();
  }

  /** Classify and derive APPROVE/HOLD/REJECT from administrable thresholds. */
  async moderate(text: string, context: string): Promise<ModerationResult> {
    const thresholds = await this.settings.getModerationThresholds();
    let risk = 0;
    let categories: string[] = [];
    try {
      ({ risk, categories } = await this.classifier.classify(text, context));
    } catch (error) {
      // Fail-safe: if the classifier is down, HOLD instead of delivering
      // unmoderated content (moderación previa is non-negotiable).
      this.logger.error(`classifier failure: ${String(error)}`);
      return { risk: 1, categories: ['classifier_error'], decision: 'HOLD' };
    }
    return { risk, categories, decision: decideFromThresholds(risk, thresholds) };
  }
}

export function decideFromThresholds(
  risk: number,
  thresholds: { hold: number; reject: number },
): 'APPROVE' | 'HOLD' | 'REJECT' {
  if (risk >= thresholds.reject) return 'REJECT';
  if (risk >= thresholds.hold) return 'HOLD';
  return 'APPROVE';
}
