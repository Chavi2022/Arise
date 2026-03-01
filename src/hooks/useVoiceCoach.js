import { useRef, useCallback, useEffect, useState } from 'react';

const ELEVEN_VOICE = 'TxGEqnHWrfWFTfGW9XjX'; // Josh — young, energetic male
const CUE_INTERVAL_MS = 4500;

// ─── Smart cue generator (no API needed) ──────────────────────────
function generateCue(frame, lastCue) {
  const { exercise, angle, stage, reps, targetReps, seconds, targetSeconds } = frame;
  const isPlank = exercise === 'PLANK';
  const progress = isPlank
    ? (seconds / (targetSeconds || 1))
    : (reps / (targetReps || 1));
  const remaining = isPlank ? (targetSeconds - seconds) : (targetReps - reps);

  const pool = [];

  // ── Completion ──
  if (progress >= 1) {
    pool.push(
      "That's it, challenge crushed!",
      "Done! You killed that!",
      "All done, nice work!",
    );
    return pick(pool, lastCue);
  }

  // ── Last stretch (90%+) ──
  if (progress > 0.9) {
    pool.push(
      "Almost there, finish strong!",
      `Last ${remaining}, give me everything!`,
      "Don't stop now, so close!",
      "Dig deep, you're right there!",
      "Come on, finish this!",
    );
    return pick(pool, lastCue);
  }

  // ── Milestone reps ──
  if (!isPlank && reps > 0 && reps % 5 === 0 && progress < 0.9) {
    pool.push(
      `That's ${reps}, keep it rolling!`,
      `${reps} done, looking strong!`,
      `Nice, ${remaining} more to go!`,
      "Halfway mark, don't slow down!",
    );
    return pick(pool, lastCue);
  }

  // ── Plank time milestones ──
  if (isPlank && seconds > 0 && seconds % 15 === 0 && progress < 0.9) {
    pool.push(
      `${seconds} seconds, stay with me!`,
      `${remaining} seconds left, hold it!`,
      "You're doing great, keep holding!",
      "Breathe through it, stay strong!",
    );
    return pick(pool, lastCue);
  }

  // ── Exercise-specific form cues ──
  if (exercise === 'PUSH_UP') {
    if (stage === 'down' || (angle !== null && angle < 70)) {
      pool.push(
        "There you go, perfect depth",
        "Nice, now explode back up",
        "Good, chest almost touching",
        "That's deep enough, push up!",
        "Beautiful form right there",
      );
    } else if (stage === 'up' || (angle !== null && angle > 140)) {
      pool.push(
        "Lock it out, good rep",
        "Now back down, controlled",
        "Solid lockout, keep going",
        "Good, right back into it",
        "Arms straight, nice",
      );
    } else {
      pool.push(
        "Get a little deeper for me",
        "Keep that chest going down",
        "Almost there, bend those arms",
        "You're halfway down, finish it",
        "Push through the full range",
      );
    }
  }

  else if (exercise === 'SQUAT') {
    if (stage === 'down' || (angle !== null && angle < 80)) {
      pool.push(
        "Yeah, that's a real squat",
        "Nice depth, now drive up",
        "Sit into it, perfect",
        "Good, now stand it up!",
        "That's the depth I want",
      );
    } else if (stage === 'up' || (angle !== null && angle > 150)) {
      pool.push(
        "Drive through those heels!",
        "Stand tall, squeeze at the top",
        "Good rep, back down again",
        "Chest up, looking great",
        "Power through, let's go!",
      );
    } else {
      pool.push(
        "Sit back a little more",
        "Get those hips lower",
        "Break parallel for me",
        "A little deeper, you got it",
        "Keep sitting back",
      );
    }
  }

  else if (exercise === 'SIT_UP') {
    if (stage === 'down' || (angle !== null && angle < 90)) {
      pool.push(
        "All the way up, let's go!",
        "Touch your knees, come on",
        "Squeeze those abs at the top",
        "Good crunch, nice form",
        "That's a full sit up!",
      );
    } else if (stage === 'up' || (angle !== null && angle > 145)) {
      pool.push(
        "Control it back down",
        "Nice and smooth going back",
        "Good, right into the next one",
        "Don't rest at the bottom",
        "Keep the momentum going",
      );
    } else {
      pool.push(
        "Keep curling up, almost there",
        "Engage that core, pull up",
        "You're so close, finish it",
        "Don't give up on this rep",
        "Drive it all the way up",
      );
    }
  }

  else if (exercise === 'PLANK') {
    if (angle !== null && angle >= 160 && angle <= 200) {
      pool.push(
        "Body's looking solid, hold it",
        "Perfect plank, stay right there",
        "Core's engaged, breathe through it",
        "You're locked in, don't move",
        "That's what I wanna see",
        "Stay tight, you got this",
      );
    } else if (angle !== null && angle < 160) {
      pool.push(
        "Bring those hips up a bit",
        "Don't let your hips sag",
        "Tighten that core, lift up",
        "Hips are dropping, fix it",
        "Engage your abs, level out",
      );
    } else {
      pool.push(
        "Lower your hips a little",
        "Flatten that back out",
        "You're piking up, come down",
        "Straight line from head to heels",
      );
    }
  }

  // ── Sprinkle in general motivation ──
  if (Math.random() < 0.25 && progress > 0.1 && progress < 0.85) {
    pool.push(
      "You got this, stay focused!",
      "Keep that energy up!",
      "Looking strong right now!",
      "I see you putting in work!",
      "That's the effort I like!",
      "No slowing down!",
    );
  }

  return pick(pool, lastCue);
}

function pick(pool, lastCue) {
  const filtered = pool.filter(c => c !== lastCue);
  const arr = filtered.length ? filtered : pool;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Gemini (bonus — used when available) ─────────────────────────
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

const SYSTEM_PROMPT = `You're a personal trainer coaching someone through an exercise in real time. Talk like a real coach at the gym — casual, encouraging, natural. Use contractions and energy.

Data per frame: exercise, angle (degrees), stage ("up"/"down"/null), reps, targetReps, seconds, targetSeconds.

Rules:
1. Respond with ONLY the spoken cue — 5 to 12 words
2. Sound human. Examples: "There you go, that's a real squat", "Come on three more, you got this", "Don't quit on me now, finish strong"
3. React to the angle: if they're deep enough, hype them. If not deep enough, coach them lower.
4. Near the end get intense: "Last one, everything you got!", "Ten seconds, don't you dare stop!"
5. NO quotes, NO emojis, NO formatting — just raw words as spoken`;

function getGeminiKey() {
  const env = import.meta.env.VITE_GEMINI_KEY ?? '';
  if (env) return env;
  try { return localStorage.getItem('arise_gemini_key') ?? ''; } catch { return ''; }
}

function getElevenKey() {
  const env = import.meta.env.VITE_ELEVEN_KEY ?? '';
  if (env) return env;
  try { return localStorage.getItem('arise_eleven_key') ?? ''; } catch { return ''; }
}

function isEnabled() {
  if (import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_ELEVEN_KEY) return true;
  try { return localStorage.getItem('arise_coach_enabled') === 'true'; } catch { return false; }
}

async function askGemini(apiKey, frameData, lastCue) {
  const prompt = `${JSON.stringify(frameData)}\nLast cue: "${lastCue}"`;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 40, temperature: 0.9 },
          }),
        }
      );
      if (res.status === 429) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
        .trim().replace(/^["']|["']$/g, '').replace(/\n/g, ' ');
      if (text && text.length > 2) return text;
    } catch { /* try next model */ }
  }
  return null;
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────
async function speakElevenLabs(text) {
  const apiKey = getElevenKey();
  if (!apiKey) return false;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.85,
          style: 0.7,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(true); };
    setTimeout(() => { URL.revokeObjectURL(url); resolve(true); }, 8000);
  });
}

// ─── Browser speech fallback ──────────────────────────────────────
function speakBrowser(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.1;
    utt.pitch = 1.0;
    utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (v) utt.voice = v;
    utt.onend = resolve;
    utt.onerror = resolve;
    window.speechSynthesis.speak(utt);
    setTimeout(resolve, 5000);
  });
}

async function speak(text) {
  try {
    const ok = await speakElevenLabs(text);
    if (ok) return;
  } catch (err) {
    console.warn('[VoiceCoach] ElevenLabs error:', err.message);
  }
  await speakBrowser(text);
}

// ─── Conversational Gemini (for user questions) ──────────────────
const CONVO_PROMPT = `You're a personal trainer mid-workout. The user just asked you a question while exercising. Answer in 1-2 short sentences — casual, helpful, like a real coach talking between reps. Keep it brief because they're working out. Topics: form tips, breathing, muscle groups, motivation, how many reps left, anything fitness related. If they ask something unrelated, bring it back to the workout.`;

async function askGeminiConvo(apiKey, userMessage, frameData) {
  const context = frameData
    ? `[User is doing ${frameData.exercise}, ${frameData.reps ?? 0}/${frameData.targetReps ?? 0} reps, angle: ${frameData.angle ?? '?'}°]`
    : '';

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: CONVO_PROMPT }] },
            contents: [{ parts: [{ text: `${context}\nUser says: "${userMessage}"` }] }],
            generationConfig: { maxOutputTokens: 80, temperature: 0.8 },
          }),
        }
      );
      if (res.status === 429) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
        .trim().replace(/^["']|["']$/g, '').replace(/\n/g, ' ');
      if (text && text.length > 2) return text;
    } catch { /* try next */ }
  }
  return "I didn't catch that, let's keep going!";
}

// ─── Speech Recognition (browser native) ─────────────────────────
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

function listen() {
  return new Promise((resolve, reject) => {
    if (!SpeechRecognition) { reject(new Error('Speech recognition not supported')); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      resolve(text);
    };
    rec.onerror = (e) => reject(new Error(e.error));
    rec.onnomatch = () => resolve('');
    rec.onend = () => {}; // handled by onresult/onerror
    setTimeout(() => { try { rec.stop(); } catch {} resolve(''); }, 8000);
    rec.start();
  });
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useVoiceCoach() {
  const enabledRef  = useRef(false);
  const busyRef     = useRef(false);
  const lastCueRef  = useRef('');
  const latestRef   = useRef(null);
  const timerRef    = useRef(null);
  const mountedRef  = useRef(true);
  const pausedRef   = useRef(false);

  const [listening, setListening] = useState(false);
  const [lastReply, setLastReply] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    enabledRef.current = isEnabled();
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const processCue = useCallback(async () => {
    if (!enabledRef.current || busyRef.current || !latestRef.current || pausedRef.current) return;

    busyRef.current = true;
    try {
      let cue = null;
      const geminiKey = getGeminiKey();
      if (geminiKey) {
        try { cue = await askGemini(geminiKey, latestRef.current, lastCueRef.current); }
        catch { /* fall through */ }
      }
      if (!cue) cue = generateCue(latestRef.current, lastCueRef.current);
      if (!cue || !mountedRef.current) return;

      lastCueRef.current = cue;
      await speak(cue);
    } catch (err) {
      console.warn('[VoiceCoach]', err.message);
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(processCue, CUE_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [processCue]);

  const feedFrame = useCallback((frameData) => {
    latestRef.current = frameData;
  }, []);

  /** User taps mic → listen → send to Gemini → speak reply */
  const talkToCoach = useCallback(async () => {
    if (busyRef.current || listening) return;

    pausedRef.current = true;
    setListening(true);

    try {
      const transcript = await listen();
      setListening(false);

      if (!transcript || transcript.length < 2) {
        pausedRef.current = false;
        return;
      }

      busyRef.current = true;
      const geminiKey = getGeminiKey();
      let reply;
      if (geminiKey) {
        reply = await askGeminiConvo(geminiKey, transcript, latestRef.current);
      } else {
        reply = "I hear you! Let's keep pushing, stay focused on your form!";
      }

      setLastReply(reply);
      await speak(reply);
    } catch (err) {
      console.warn('[VoiceCoach] Talk error:', err.message);
      setListening(false);
    } finally {
      busyRef.current = false;
      pausedRef.current = false;
    }
  }, [listening]);

  return { feedFrame, talkToCoach, listening, lastReply };
}
