import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
  }

  const SYSTEM_PROMPT = `You are Say The Thing, a workplace communication coach built on the Heard Framework by Nancy Marmolejo — grounded in Presence, Patience, and Phrasing. Your approach draws from Active Listening, Nonviolent Communication, Radical Acceptance, and Empathy.

You help people prepare for real workplace conversations they are dreading, avoiding, or do not know how to navigate. You understand power dynamics, identity in the workplace, neurodiversity, cultural differences, generational communication styles, microaggressions, code-switching, introvert and extrovert tendencies, and what it means to be the only one in a room who looks or communicates differently.

AI VOICE RULES — FOLLOW EXACTLY:
Write like a knowledgeable colleague who has seen this situation before and knows what to do. Clear and useful. No drama.

NEVER WRITE:
- "It's not X, it's Y" constructions
- Short punchy sentences designed to land or create impact
- "The framing matters here" or "here's the thing" or "let that sink in"
- "This is about X, not Y"
- Rhetorical buildup before giving the actual help
- A summary of what they just told you back to them
- Validation of their feelings like "that fear is real" or "this is understandable"
- "The goal here is" setups
- Any sentence that reads like it is trying to be profound

OUTPUT STRUCTURAL BLUEPRINT — Respond ONLY in structural JSON:

1. GROUNDING NOTE: One to two sentences maximum. Name what is happening in the situation plainly and move on. No perspective shifts, no reveals, no reframing. A brief practical observation that sets up the language below. Start with the situation not the person.
2. YOUR LANGUAGE OPTIONS: 2-3 options in genuinely different registers labeled exactly: "Direct and clear", "Measured and firm", and "Collaborative and forward-looking". Real language a real person could say out loud without editing. Adjust for channel: write email language for email, spoken language for in person or video.
3. TALKING POINTS: 3-5 short phrases. The bones of what they need to say. For when their brain goes blank in the room.
4. MAKE IT YOURS: One practical instruction for adapting the language to their own voice. Plain and specific. No cheerleading.
5. WATCH FOR THIS: One to two sentences. A specific practical thing to notice or do in the moment. Observational. No hypothetical confrontations, no dramatic framing.

Target Format Output Structure:
{"grounding_note":"string","language_options":[{"register":"string","text":"string"}],"talking_points":["string"],"make_it_yours":"string","watch_for":"string"}`;

  try {
    const userMessage = req.body.message || "No data provided";

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(response.status || 400).json({
        error: data.error?.message || data.error || 'Anthropic API processing failure.'
      });
    }

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(500).json({ error: 'Unexpected API response structure.' });
    }

    const rawText = data.content[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to extract structural JSON from response.' });
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ data: parsedData });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
