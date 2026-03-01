const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const NUTRITION_PROMPT = `You are a nutrition analysis expert. Analyze this meal and return ONLY a valid JSON array of food items found.

Each item must have this exact structure:
{
  "name": "Food Name",
  "brand": "Category",
  "servingSize": "estimated weight",
  "per100g": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "servings": number (estimated servings based on portion visible, where 1 serving = 100g)
}

Be accurate with nutritional values per 100g. Estimate portion sizes from the image.
Return ONLY the JSON array, no markdown, no explanation.`;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function friendlyError(status, raw) {
  if (status === 429) return 'API rate limit reached. Please wait a minute and try again.';
  if (status === 403) return 'API key does not have access. Check that the Generative Language API is enabled in your Google Cloud console.';
  if (status === 400) return 'Bad request — the image may be too large or in an unsupported format.';
  return `Gemini API error (${status}). Please try again.`;
}

export async function analyzeMealImage(imageFile) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured');

  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const body = {
    contents: [{
      parts: [
        { text: NUTRITION_PROMPT },
        { inlineData: { mimeType, data: base64 } },
      ],
    }],
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(friendlyError(res.status, err));
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseNutritionResponse(text);
}

export async function analyzeMealText(description) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured');

  const body = {
    contents: [{
      parts: [
        { text: NUTRITION_PROMPT + `\n\nThe user describes their meal as: "${description}"\nEstimate reasonable portion sizes.` },
      ],
    }],
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(friendlyError(res.status, err));
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseNutritionResponse(text);
}

// ─── Live Form Analysis ──────────────────────────────────────────
const FORM_PROMPT = `You are an expert personal trainer watching someone exercise via pose detection data. Based on the joint angles and exercise context provided, give ONE short, specific form tip or encouragement (max 12 words). Be conversational like a real coach mid-workout. Examples: "Deeper! Get those thighs parallel", "Great depth, keep it up!", "Straighten your back more", "Elbows closer to your body". Return ONLY the tip text, nothing else.`;

export async function analyzeForm({ exercise, angle, reps, targetReps, seconds, targetSeconds, stage }) {
  if (!GEMINI_API_KEY) return null;

  const context = [
    `Exercise: ${exercise}`,
    angle != null ? `Current joint angle: ${angle}°` : null,
    stage ? `Movement stage: ${stage}` : null,
    reps != null ? `Reps completed: ${reps}/${targetReps}` : null,
    seconds != null ? `Seconds held: ${seconds}/${targetSeconds}` : null,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${FORM_PROMPT}\n\n${context}` }] }],
        generationConfig: { maxOutputTokens: 30, temperature: 0.9 },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().replace(/^["']|["']$/g, '');
    return text.length > 2 ? text : null;
  } catch {
    return null;
  }
}

function parseNutritionResponse(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const items = JSON.parse(cleaned);
  if (!Array.isArray(items)) throw new Error('Unexpected response format');

  return items.map((item) => ({
    id: Math.random().toString(36).slice(2),
    name: item.name || 'Unknown food',
    brand: item.brand || 'Scanned',
    servingSize: item.servingSize || '100g',
    per100g: {
      calories: Math.round(item.per100g?.calories ?? 0),
      protein:  Math.round((item.per100g?.protein ?? 0) * 10) / 10,
      carbs:    Math.round((item.per100g?.carbs ?? 0) * 10) / 10,
      fat:      Math.round((item.per100g?.fat ?? 0) * 10) / 10,
    },
    servings: item.servings ?? 1,
  }));
}
