const KB = [
  {
    keywords: ['squat', 'squats', 'squatting', 'knees', 'quads', 'glutes'],
    response:
      "**Squats** target your quads, glutes, and hamstrings.\n\n✅ Form tips:\n- Feet shoulder-width apart\n- Chest up, back straight\n- Knees track over toes (not caving in)\n- Lower until thighs are parallel to the floor\n- Drive through your heels on the way up\n\nStart with bodyweight, then add load once form is solid.",
  },
  {
    keywords: ['push', 'pushup', 'push-up', 'chest', 'tricep', 'triceps'],
    response:
      "**Push-ups** are a compound upper-body movement hitting your chest, triceps, and shoulders.\n\n✅ Form tips:\n- Body in a straight line from head to heels\n- Hands just outside shoulder-width\n- Lower until chest nearly touches the floor\n- Elbows at ~45° (not flared straight out)\n- Full lockout at the top\n\nStruggling? Start on your knees and build up.",
  },
  {
    keywords: ['plank', 'core', 'abs', 'hold', 'isometric'],
    response:
      "**Planks** are an isometric core exercise — no movement, just a solid hold.\n\n✅ Form tips:\n- Hips level (not sagging, not raised)\n- Look at the floor to keep a neutral neck\n- Squeeze your glutes and abs the whole time\n- Breathe steadily\n\nAim for 3 × 30–60 seconds. Build to 2 minutes over time.",
  },
  {
    keywords: ['warm', 'warmup', 'warm-up', 'stretch', 'stretching'],
    response:
      "A good warm-up (5–10 min) should include:\n\n1. **Light cardio** — jumping jacks, high knees, or a brisk walk\n2. **Dynamic stretches** — leg swings, arm circles, hip circles\n3. **Activation** — glute bridges, band walks\n\nAvoid static stretching before lifting — save that for after your workout.",
  },
  {
    keywords: ['cool', 'cooldown', 'cool-down', 'recovery', 'recover'],
    response:
      "After your workout:\n\n1. **5 min light walk** to bring heart rate down\n2. **Static stretches** — hold each 20–30 seconds (quads, hip flexors, chest, shoulders)\n3. **Hydrate** — drink water and replenish electrolytes if you sweated a lot\n4. **Sleep** — the most powerful recovery tool there is",
  },
  {
    keywords: ['protein', 'eat', 'nutrition', 'diet', 'food', 'meal', 'calories'],
    response:
      "Nutrition basics for fitness:\n\n- **Protein:** 0.7–1 g per lb of bodyweight to build/maintain muscle (chicken, eggs, fish, Greek yogurt)\n- **Carbs:** your main fuel source — don't fear them. Time them around workouts.\n- **Fats:** essential for hormones — avocado, nuts, olive oil\n- **Calories:** slight surplus to gain muscle, deficit to lose fat. Track for 2–3 weeks to learn your baseline.",
  },
  {
    keywords: ['beginner', 'start', 'starting', 'new', 'how often', 'frequency'],
    response:
      "**Beginner workout plan:**\n\n3 days/week (e.g. Mon · Wed · Fri)\n\nEach session:\n- Squats: 3 × 10\n- Push-ups: 3 × 8–10\n- Plank: 3 × 30 sec\n\nRest 60–90 seconds between sets. Add reps or time each week. Consistency beats intensity — show up every session.",
  },
  {
    keywords: ['rest', 'rest day', 'how many days', 'overtraining'],
    response:
      "**Rest and recovery matter as much as training.**\n\n- Beginners: 1 rest day between sessions (e.g. 3×/week)\n- Intermediate: 4–5×/week with programmed deload every 4–6 weeks\n- Overtraining signs: persistent soreness, poor sleep, declining performance, irritability\n\nActive recovery (walking, yoga, swimming) on rest days is totally fine.",
  },
  {
    keywords: ['lose weight', 'fat loss', 'weight loss', 'burn fat', 'cut'],
    response:
      "Fat loss comes down to a **calorie deficit** — burning more than you eat.\n\n✅ Strategy:\n- Find your TDEE (Total Daily Energy Expenditure) using an online calculator\n- Eat 300–500 calories below TDEE\n- Keep protein high (0.8–1 g/lb) to preserve muscle\n- Strength training + cardio speeds things up\n- Aim for 0.5–1 lb/week of loss — sustainable and muscle-preserving",
  },
  {
    keywords: ['muscle', 'gain', 'bulk', 'build', 'hypertrophy', 'stronger'],
    response:
      "To build muscle:\n\n- **Progressive overload** — consistently add reps, sets, or load over time\n- **Volume** — 10–20 working sets per muscle group per week\n- **Protein** — at least 0.7 g/lb bodyweight\n- **Slight calorie surplus** — 200–300 cal above maintenance\n- **Sleep** — 7–9 hours; most muscle repair happens here\n\nResults take months. Stay consistent and trust the process.",
  },
  {
    keywords: ['motivation', 'lazy', 'tired', 'unmotivated', 'quit', 'give up'],
    response:
      "Motivation comes and goes — **discipline** is what keeps you going.\n\nTips to stay on track:\n- Set specific, measurable goals\n- Track your workouts (you're already using AriseFit!)\n- Find a workout partner or accountability buddy\n- Make it non-negotiable — same time every day\n- Celebrate small wins\n\nRemember: the hardest part is starting. Once you're moving, it gets easier.",
  },
  {
    keywords: ['hello', 'hi', 'hey', 'howdy', 'sup', 'what can you do', 'help'],
    response:
      "Hey! I'm your **AriseFit AI Coach** 👋\n\nI can help you with:\n- 🦵 Exercise form & technique (squats, push-ups, planks)\n- 🍎 Nutrition and diet advice\n- 💤 Recovery and rest\n- 📅 Workout programming\n- 💪 Building muscle or losing fat\n\nJust ask me anything fitness-related!",
  },
];

const FALLBACK =
  "I'm not sure about that one. Try asking me about **squats**, **push-ups**, **planks**, nutrition, recovery, or how to structure your workouts!";

export function getBotResponse(input) {
  const lower = input.toLowerCase();
  for (const entry of KB) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.response;
    }
  }
  return FALLBACK;
}
