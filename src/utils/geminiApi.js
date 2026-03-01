const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
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
