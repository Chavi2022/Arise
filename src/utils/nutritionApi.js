const BASE = 'https://world.openfoodfacts.org';

/**
 * Search Open Food Facts (free, no API key required).
 * Returns an array of normalized food items.
 */
export async function searchFood(query) {
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&json=1&page_size=20&fields=product_name,brands,serving_size,nutriments&sort_by=unique_scans_n`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch food data');
  const data = await res.json();

  return (data.products ?? [])
    .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map(normalizeProduct);
}

function normalizeProduct(p) {
  const n = p.nutriments ?? {};
  return {
    id: Math.random().toString(36).slice(2),
    name: p.product_name,
    brand: p.brands ?? '',
    servingSize: p.serving_size ?? '100g',
    // Values are per 100g; we default 1 serving = 100g
    per100g: {
      calories: Math.round(n['energy-kcal_100g'] ?? 0),
      protein:  Math.round((n['proteins_100g']       ?? 0) * 10) / 10,
      carbs:    Math.round((n['carbohydrates_100g']   ?? 0) * 10) / 10,
      fat:      Math.round((n['fat_100g']             ?? 0) * 10) / 10,
    },
    servings: 1,   // user-adjustable multiplier
  };
}

/** Quick suggestions for common foods — no network needed. */
export const QUICK_FOODS = [
  // ── Proteins ────────────────────────────────────────────────────
  { id: 'q1',  name: 'Chicken Breast',      brand: 'Protein', servingSize: '100g', per100g: { calories: 165, protein: 31,  carbs: 0,   fat: 3.6 }, servings: 1 },
  { id: 'q2',  name: 'Salmon Fillet',        brand: 'Protein', servingSize: '100g', per100g: { calories: 208, protein: 20,  carbs: 0,   fat: 13  }, servings: 1 },
  { id: 'q3',  name: 'Whole Egg',            brand: 'Protein', servingSize: '50g',  per100g: { calories: 155, protein: 13,  carbs: 1.1, fat: 11  }, servings: 1 },
  { id: 'q4',  name: 'Egg White (3 large)',  brand: 'Protein', servingSize: '99g',  per100g: { calories: 52,  protein: 11,  carbs: 0.7, fat: 0.2 }, servings: 1 },
  { id: 'q5',  name: 'Ground Beef (lean)',   brand: 'Protein', servingSize: '100g', per100g: { calories: 215, protein: 26,  carbs: 0,   fat: 12  }, servings: 1 },
  { id: 'q6',  name: 'Tuna (canned)',        brand: 'Protein', servingSize: '100g', per100g: { calories: 116, protein: 26,  carbs: 0,   fat: 1.0 }, servings: 1 },
  { id: 'q7',  name: 'Shrimp',              brand: 'Protein', servingSize: '100g', per100g: { calories: 99,  protein: 24,  carbs: 0.2, fat: 0.3 }, servings: 1 },
  { id: 'q8',  name: 'Turkey Breast',       brand: 'Protein', servingSize: '100g', per100g: { calories: 135, protein: 30,  carbs: 0,   fat: 1.0 }, servings: 1 },
  { id: 'q9',  name: 'Cottage Cheese',      brand: 'Protein', servingSize: '100g', per100g: { calories: 98,  protein: 11,  carbs: 3.4, fat: 4.3 }, servings: 1 },
  { id: 'q10', name: 'Greek Yogurt',        brand: 'Protein', servingSize: '100g', per100g: { calories: 59,  protein: 10,  carbs: 3.6, fat: 0.4 }, servings: 1 },
  { id: 'q11', name: 'Whey Protein Shake',  brand: 'Protein', servingSize: '30g',  per100g: { calories: 370, protein: 80,  carbs: 5,   fat: 3.5 }, servings: 1 },
  { id: 'q12', name: 'Tofu (firm)',         brand: 'Protein', servingSize: '100g', per100g: { calories: 76,  protein: 8,   carbs: 1.9, fat: 4.8 }, servings: 1 },
  // ── Carbs & Grains ───────────────────────────────────────────────
  { id: 'q13', name: 'White Rice (cooked)', brand: 'Carbs', servingSize: '100g', per100g: { calories: 130, protein: 2.7, carbs: 28,  fat: 0.3 }, servings: 1 },
  { id: 'q14', name: 'Brown Rice (cooked)', brand: 'Carbs', servingSize: '100g', per100g: { calories: 123, protein: 2.7, carbs: 26,  fat: 1.0 }, servings: 1 },
  { id: 'q15', name: 'Oats (dry)',          brand: 'Carbs', servingSize: '100g', per100g: { calories: 389, protein: 17,  carbs: 66,  fat: 7.0 }, servings: 1 },
  { id: 'q16', name: 'Whole Wheat Bread',   brand: 'Carbs', servingSize: '30g',  per100g: { calories: 247, protein: 9,   carbs: 47,  fat: 3.4 }, servings: 1 },
  { id: 'q17', name: 'Sweet Potato',        brand: 'Carbs', servingSize: '100g', per100g: { calories: 86,  protein: 1.6, carbs: 20,  fat: 0.1 }, servings: 1 },
  { id: 'q18', name: 'Pasta (cooked)',      brand: 'Carbs', servingSize: '100g', per100g: { calories: 158, protein: 5.8, carbs: 31,  fat: 0.9 }, servings: 1 },
  { id: 'q19', name: 'Quinoa (cooked)',     brand: 'Carbs', servingSize: '100g', per100g: { calories: 120, protein: 4.4, carbs: 22,  fat: 1.9 }, servings: 1 },
  { id: 'q20', name: 'Bagel (plain)',       brand: 'Carbs', servingSize: '98g',  per100g: { calories: 270, protein: 10,  carbs: 53,  fat: 1.7 }, servings: 1 },
  // ── Fruits ───────────────────────────────────────────────────────
  { id: 'q21', name: 'Banana',             brand: 'Fruit', servingSize: '120g', per100g: { calories: 89,  protein: 1.1, carbs: 23,  fat: 0.3 }, servings: 1 },
  { id: 'q22', name: 'Apple',              brand: 'Fruit', servingSize: '182g', per100g: { calories: 52,  protein: 0.3, carbs: 14,  fat: 0.2 }, servings: 1 },
  { id: 'q23', name: 'Blueberries',        brand: 'Fruit', servingSize: '100g', per100g: { calories: 57,  protein: 0.7, carbs: 14,  fat: 0.3 }, servings: 1 },
  { id: 'q24', name: 'Strawberries',       brand: 'Fruit', servingSize: '100g', per100g: { calories: 32,  protein: 0.7, carbs: 7.7, fat: 0.3 }, servings: 1 },
  { id: 'q25', name: 'Orange',             brand: 'Fruit', servingSize: '130g', per100g: { calories: 47,  protein: 0.9, carbs: 12,  fat: 0.1 }, servings: 1 },
  // ── Vegetables ───────────────────────────────────────────────────
  { id: 'q26', name: 'Broccoli',           brand: 'Veggie', servingSize: '100g', per100g: { calories: 34,  protein: 2.8, carbs: 7,   fat: 0.4 }, servings: 1 },
  { id: 'q27', name: 'Spinach',            brand: 'Veggie', servingSize: '100g', per100g: { calories: 23,  protein: 2.9, carbs: 3.6, fat: 0.4 }, servings: 1 },
  { id: 'q28', name: 'Mixed Salad',        brand: 'Veggie', servingSize: '100g', per100g: { calories: 20,  protein: 1.5, carbs: 3.5, fat: 0.3 }, servings: 1 },
  { id: 'q29', name: 'Bell Pepper',        brand: 'Veggie', servingSize: '100g', per100g: { calories: 31,  protein: 1.0, carbs: 6,   fat: 0.3 }, servings: 1 },
  // ── Fats & Dairy ─────────────────────────────────────────────────
  { id: 'q30', name: 'Avocado (half)',     brand: 'Fats',   servingSize: '75g',  per100g: { calories: 160, protein: 2,   carbs: 9,   fat: 15  }, servings: 1 },
  { id: 'q31', name: 'Peanut Butter',      brand: 'Fats',   servingSize: '32g',  per100g: { calories: 588, protein: 25,  carbs: 20,  fat: 50  }, servings: 1 },
  { id: 'q32', name: 'Almonds',            brand: 'Fats',   servingSize: '28g',  per100g: { calories: 579, protein: 21,  carbs: 22,  fat: 50  }, servings: 1 },
  { id: 'q33', name: 'Whole Milk (200ml)', brand: 'Dairy',  servingSize: '200ml',per100g: { calories: 61,  protein: 3.2, carbs: 4.8, fat: 3.3 }, servings: 1 },
  { id: 'q34', name: 'Cheddar Cheese',     brand: 'Dairy',  servingSize: '28g',  per100g: { calories: 402, protein: 25,  carbs: 1.3, fat: 33  }, servings: 1 },
  // ── Meals / Fast Food ────────────────────────────────────────────
  { id: 'q35', name: 'Burrito Bowl',       brand: 'Meal',   servingSize: '400g', per100g: { calories: 165, protein: 10,  carbs: 20,  fat: 5   }, servings: 1 },
  { id: 'q36', name: 'Caesar Salad',       brand: 'Meal',   servingSize: '300g', per100g: { calories: 120, protein: 7,   carbs: 8,   fat: 7   }, servings: 1 },
  { id: 'q37', name: 'Burger (plain)',      brand: 'Meal',   servingSize: '200g', per100g: { calories: 295, protein: 17,  carbs: 24,  fat: 14  }, servings: 1 },
  { id: 'q38', name: 'Pizza (1 slice)',     brand: 'Meal',   servingSize: '100g', per100g: { calories: 266, protein: 11,  carbs: 33,  fat: 10  }, servings: 1 },
  // ── Drinks & Snacks ──────────────────────────────────────────────
  { id: 'q39', name: 'Protein Bar',        brand: 'Snack',  servingSize: '60g',  per100g: { calories: 370, protein: 30,  carbs: 40,  fat: 9   }, servings: 1 },
  { id: 'q40', name: 'Rice Cakes (2)',     brand: 'Snack',  servingSize: '18g',  per100g: { calories: 387, protein: 8,   carbs: 82,  fat: 3   }, servings: 1 },
  { id: 'q41', name: 'Orange Juice (200ml)',brand:'Drink',  servingSize: '200ml',per100g: { calories: 45,  protein: 0.7, carbs: 10,  fat: 0.2 }, servings: 1 },
  { id: 'q42', name: 'Coffee (black)',      brand: 'Drink',  servingSize: '240ml',per100g: { calories: 2,   protein: 0.3, carbs: 0,   fat: 0   }, servings: 1 },
];

/** Compute macros for a logged food item (respects servings multiplier). */
export function macrosFor(food) {
  const s = food.servings ?? 1;
  return {
    calories: Math.round(food.per100g.calories * s),
    protein:  Math.round(food.per100g.protein  * s * 10) / 10,
    carbs:    Math.round(food.per100g.carbs    * s * 10) / 10,
    fat:      Math.round(food.per100g.fat      * s * 10) / 10,
  };
}

/** Sum macros across an array of food items. */
export function sumMacros(foods = []) {
  return foods.reduce(
    (acc, f) => {
      const m = macrosFor(f);
      return {
        calories: acc.calories + m.calories,
        protein:  acc.protein  + m.protein,
        carbs:    acc.carbs    + m.carbs,
        fat:      acc.fat      + m.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
