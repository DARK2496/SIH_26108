// /api/extract — server-side proxy to the Claude API.
//
// The API key lives only here, as a Vercel Environment Variable
// (ANTHROPIC_API_KEY). It is never sent to, or readable by, the browser.
// The frontend calls this endpoint instead of Anthropic directly.
//
// If the key is missing, the call fails, or the model output isn't valid
// JSON, this returns a 4xx/5xx and the frontend falls back to its
// built-in offline rule-based extractor — so the app still works even
// with zero configuration, it just skips the "live AI" step.

const SYSTEM_PROMPT = `You extract structured procurement requirements from Indian government tender text.
Respond with ONLY a raw JSON object — no markdown fences, no preamble, no commentary.

Schema:
{
  "product": string,
  "category": one of ["luminaire","cable","switchgear","other"],
  "attributes": {
    "power_rating_w": number|null,
    "ip_rating": string|null,
    "voltage_v": number|null,
    "material": string|null
  },
  "application": one of ["street","area","flood","indoor","outdoor","underground",null],
  "existing_is_refs": [string]
}

Only include an existing_is_refs entry if an IS standard number is explicitly written in the
source text (e.g. "IS 10322 (Part 5):2016"). Never invent a standard number that is not
present in the text. If a field cannot be determined, use null.`;

module.exports = async (req, res) => {
  // Basic CORS/method guarding — this endpoint is only meant to be called
  // by the app's own frontend.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'server_not_configured', detail: 'ANTHROPIC_API_KEY is not set on this deployment.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const text = (body && body.text) ? String(body.text) : '';
  if (!text.trim()) {
    return res.status(400).json({ error: 'missing_text' });
  }
  // Cap input size — this is a short tender clause, not a document upload.
  const clipped = text.slice(0, 4000);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [ { role: 'user', content: clipped } ]
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(502).json({ error: 'upstream_error', status: upstream.status, detail: errText.slice(0, 300) });
    }

    const data = await upstream.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'no_text_block' });
    }

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: 'invalid_json_from_model', detail: cleaned.slice(0, 300) });
    }

    parsed.__source = 'live';
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: 'server_error', detail: String(err && err.message ? err.message : err) });
  }
};
