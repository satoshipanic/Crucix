// MiniMax Provider — Anthropic-compatible API (https://api.minimax.io/anthropic)
// Same request/response shape as Anthropic; supports MiniMax-M2.1, MiniMax-M2.5, etc.

import { LLMProvider } from './provider.mjs';

const MINIMAX_BASE = 'https://api.minimax.io/anthropic';

export class MiniMaxProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'minimax';
    this.apiKey = config.apiKey;
    this.model = config.model || 'MiniMax-M2.5';
  }

  get isConfigured() {
    return !!this.apiKey;
  }

  async complete(systemPrompt, userMessage, opts = {}) {
    const res = await fetch(`${MINIMAX_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens || 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(opts.timeout || 60000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`MiniMax API ${res.status}: ${err.substring(0, 200)}`);
    }

    const data = await res.json();
    // Response may include thinking + text blocks; concatenate text blocks for compatibility
    const text = (data.content || [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('')
      .trim() || (data.content?.[0]?.text ?? '');

    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      model: data.model || this.model,
    };
  }
}
