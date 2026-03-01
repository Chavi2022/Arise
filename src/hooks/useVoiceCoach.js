import { useRef, useCallback, useEffect, useState } from 'react';

const ELEVEN_VOICE = 'pNInz6obpgDQGcFmaJgB'; // Adam — deep, natural male

// ─── Gemini (for conversational replies) ─────────────────────────
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

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
  try {
    if (localStorage.getItem('arise_coach_enabled') === 'false') return false;
  } catch { /* ok */ }
  return true;
}

function unlockAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  setTimeout(() => ctx.close(), 100);
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function speakElevenLabs(text) {
  const apiKey = getElevenKey();
  if (!apiKey) return false;

  const res = await withTimeout(
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.9,
          style: 0.5,
          use_speaker_boost: false,
        },
      }),
    }),
    4000
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

    const trySpeak = () => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.1;
      utt.pitch = 1.0;
      utt.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (enVoice) utt.voice = enVoice;
      utt.onend = resolve;
      utt.onerror = resolve;
      window.speechSynthesis.speak(utt);
      setTimeout(resolve, 5000);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = trySpeak;
      setTimeout(resolve, 3000);
    }
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
    setTimeout(() => { 
      try { 
        rec.stop(); 
      } catch { /* timeout */ } 
      resolve(''); 
    }, 8000);
    rec.start();
  });
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useVoiceCoach() {
  const enabledRef  = useRef(false);
  const busyRef     = useRef(false);
  const latestRef   = useRef(null);
  const mountedRef  = useRef(true);
  const pausedRef   = useRef(false);
  const mutedRef    = useRef(false);
  const lastRepRef  = useRef(0);
  const lastSecAnnounceRef = useRef(0);

  const [listening, setListening] = useState(false);
  const [lastReply, setLastReply] = useState('');
  const [muted, _setMuted] = useState(false);

  const setMuted = useCallback((val) => {
    const next = typeof val === 'function' ? val(mutedRef.current) : val;
    mutedRef.current = next;
    _setMuted(next);
    if (next) { window.speechSynthesis?.cancel(); }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    enabledRef.current = isEnabled();
    return () => { mountedRef.current = false; window.speechSynthesis?.cancel(); };
  }, []);

  const activate = useCallback(() => {
    enabledRef.current = true;
    lastRepRef.current = 0;
    lastSecAnnounceRef.current = 0;
    busyRef.current = false;
    try { unlockAudio(); } catch { /* ok */ }
    setTimeout(async () => {
      if (mutedRef.current) return;
      busyRef.current = true;
      try {
        await withTimeout(speak("Let's go!"), 3000);
      } catch { /* skip if too slow */ }
      busyRef.current = false;
    }, 300);
  }, []);

  const speakCue = useCallback(async (text) => {
    if (!text || mutedRef.current || pausedRef.current || !mountedRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;
    const timeout = setTimeout(() => { busyRef.current = false; }, 6000);
    try { await speak(text); } catch (err) { console.warn('[VoiceCoach]', err.message); }
    clearTimeout(timeout);
    busyRef.current = false;
  }, []);

  const feedFrame = useCallback((frameData) => {
    latestRef.current = frameData;
    if (!enabledRef.current || mutedRef.current || pausedRef.current) return;

    const isPlank = frameData.exercise === 'PLANK';

    // Rep-based: announce the number when it changes
    if (!isPlank && frameData.reps > lastRepRef.current) {
      lastRepRef.current = frameData.reps;
      const remaining = frameData.targetReps - frameData.reps;
      let text = `${frameData.reps}`;
      if (remaining === 0) text = 'Done!';
      else if (remaining === 1) text = `${frameData.reps}! Last one!`;
      else if (remaining <= 3) text = `${frameData.reps}! ${remaining} more!`;
      speakCue(text);
    }

    // Plank: every 15 seconds
    if (isPlank) {
      const sec = frameData.seconds;
      const target = frameData.targetSeconds;
      const remaining = target - sec;
      if (sec >= target && lastSecAnnounceRef.current < target) {
        lastSecAnnounceRef.current = sec;
        speakCue('Done!');
      } else if (remaining <= 5 && remaining > 0 && sec > lastSecAnnounceRef.current) {
        lastSecAnnounceRef.current = sec;
        speakCue(`${remaining}`);
      } else if (sec > 0 && sec % 15 === 0 && sec > lastSecAnnounceRef.current) {
        lastSecAnnounceRef.current = sec;
        speakCue(`${sec} seconds`);
      }
    }
  }, [speakCue]);

  /** User taps mic → listen → send to Gemini → speak reply. Returns { transcript, reply } or null. */
  const talkToCoach = useCallback(async () => {
    if (busyRef.current || listening) return null;

    pausedRef.current = true;
    setListening(true);

    try {
      const transcript = await listen();
      setListening(false);

      if (!transcript || transcript.length < 2) {
        pausedRef.current = false;
        return null;
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
      return { transcript, reply };
    } catch (err) {
      console.warn('[VoiceCoach] Talk error:', err.message);
      setListening(false);
      return null;
    } finally {
      busyRef.current = false;
      pausedRef.current = false;
    }
  }, [listening]);

  return { feedFrame, talkToCoach, listening, lastReply, muted, setMuted, activate };
}
