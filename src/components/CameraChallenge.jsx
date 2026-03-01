import { useRef, useEffect, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { RefreshCw, Mic, MicOff, MessageCircle, Play, X, Video } from 'lucide-react';
import { useRepCounter, usePlankTimer } from '../hooks/useRepCounter';
import { useVoiceCoach } from '../hooks/useVoiceCoach';

// Singleton — only load once
let landmarker = null;
let landmarkerLoading = false;

async function getPoseLandmarker() {
  if (landmarker) return landmarker;
  if (landmarkerLoading) {
    while (landmarkerLoading) await new Promise((r) => setTimeout(r, 100));
    return landmarker;
  }
  landmarkerLoading = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } finally {
    landmarkerLoading = false;
  }
  return landmarker;
}

const EXERCISE_VIDEOS = {
  PUSH_UP: 'https://www.youtube.com/embed/IODxDxX7oi4',
  SQUAT: 'https://www.youtube.com/embed/aclHkVaku9U',
  PLANK: 'https://www.youtube.com/embed/ASdvN_XEl_c',
  SIT_UP: 'https://www.youtube.com/embed/1fbU_MkV7NE',
};

export default function CameraChallenge({ exercise, targetReps, targetSeconds, onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const lastTimeRef = useRef(-1);
  const completedRef = useRef(false);

  const exerciseRef = useRef(exercise);
  const processRepAngleRef = useRef(null);
  const processPlankAngleRef = useRef(null);
  const feedFrameRef = useRef(null);
  const repsRef = useRef(0);
  const repFlashRef = useRef(false);
  const secondsRef = useRef(0);
  const stageRef = useRef(null);
  const facingModeRef = useRef('user');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [showVideo, setShowVideo] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const voiceRecRef = useRef(null);
  const statusRef = useRef('loading');

  const isReps = exercise?.type === 'reps';

  const { reps, stage, feedback: repFeedback, currentAngle, processRepAngle, reset: resetReps } =
    useRepCounter();
  const { seconds, formFeedback, processPlankAngle, reset: resetPlank } = usePlankTimer();
  const { feedFrame, talkToCoach, listening, lastReply, setMuted, muted, activate } = useVoiceCoach();

  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);
  useEffect(() => { processRepAngleRef.current = processRepAngle; }, [processRepAngle]);
  useEffect(() => { processPlankAngleRef.current = processPlankAngle; }, [processPlankAngle]);
  useEffect(() => { feedFrameRef.current = feedFrame; }, [feedFrame]);
  useEffect(() => {
    repsRef.current = reps;
    if (reps > 0) {
      repFlashRef.current = true;
      setTimeout(() => { repFlashRef.current = false; }, 600);
    }
  }, [reps]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);

  // Completion detection
  useEffect(() => {
    if (completedRef.current) return;
    if (isReps && reps >= (targetReps ?? 0) && reps > 0) {
      completedRef.current = true;
      setStatus('done');
      setTimeout(() => onComplete?.(), 800);
    }
  }, [reps, targetReps, isReps, onComplete]);

  useEffect(() => {
    if (completedRef.current) return;
    if (!isReps && seconds >= (targetSeconds ?? 0) && seconds > 0) {
      completedRef.current = true;
      setStatus('done');
      setTimeout(() => onComplete?.(), 800);
    }
  }, [seconds, targetSeconds, isReps, onComplete]);

  const stopStream = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const stream = videoRef.current?.srcObject;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); videoRef.current.srcObject = null; }
  }, []);

  const frameLoop = useCallback(() => {
    if (!runningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarker;

    if (!video || !canvas || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(frameLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const isFront = facingModeRef.current === 'user';

    // Mirror only for front camera (natural selfie view)
    ctx.save();
    if (isFront) {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }
    ctx.restore();

    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const results = lm.detectForVideo(video, performance.now());

      if (results.landmarks?.length > 0) {
        setPoseDetected(true);
        const landmarks = results.landmarks[0];

        const drawingUtils = new DrawingUtils(ctx);
        const displayLandmarks = isFront
          ? landmarks.map((l) => ({ ...l, x: 1 - l.x }))
          : landmarks;

        const skelColor = repFlashRef.current ? '#22c55e' : '#eab308';
        const skelColorAlpha = repFlashRef.current ? '#22c55e90' : '#eab30880';

        drawingUtils.drawConnectors(displayLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: skelColorAlpha,
          lineWidth: 6,
        });
        drawingUtils.drawLandmarks(displayLandmarks, {
          color: skelColor,
          fillColor: repFlashRef.current ? '#22c55e40' : '#eab30840',
          radius: 7,
          lineWidth: 2,
        });

        const ex = exerciseRef.current;
        if (ex) {
          const angle = ex.getAngle(landmarks);
          if (ex.type === 'reps') processRepAngleRef.current?.(angle, ex);
          else processPlankAngleRef.current?.(angle, ex);

          feedFrameRef.current?.({
            exercise: ex.id,
            angle: angle !== null ? Math.round(angle) : null,
            stage: stageRef.current,
            reps: repsRef.current,
            targetReps: targetReps ?? 0,
            seconds: secondsRef.current,
            targetSeconds: targetSeconds ?? 0,
          });
        }
      } else {
        setPoseDetected(false);
      }
    }

    rafRef.current = requestAnimationFrame(frameLoop);
  }, []);

  const openCamera = useCallback(async (facing = facingModeRef.current) => {
    stopStream();
    setError(null);
    setStatus('loading');

    try {
      await getPoseLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Show live preview — user decides when to start
      setStatus('preview');

      // Start drawing preview frames (no pose processing yet)
      runningRef.current = true;
      previewLoop();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [stopStream]);

  const previewLoop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(previewLoop);
      return;
    }
    const ctx = canvas.getContext('2d');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const isFront = facingModeRef.current === 'user';
    ctx.save();
    if (isFront) { ctx.scale(-1, 1); ctx.drawImage(video, -w, 0, w, h); }
    else { ctx.drawImage(video, 0, 0, w, h); }
    ctx.restore();

    rafRef.current = requestAnimationFrame(previewLoop);
  }, []);

  const startChallenge = useCallback(async () => {
    activate();
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    setStatus('countdown');
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    setStatus('running');
    runningRef.current = true;
    frameLoop();
  }, [frameLoop, activate]);

  const flipCamera = useCallback(() => {
    const next = facingModeRef.current === 'user' ? 'environment' : 'user';
    facingModeRef.current = next;
    setFacingMode(next);
    openCamera(next);
  }, [openCamera]);

  useEffect(() => {
    completedRef.current = false;
    resetReps();
    resetPlank();
    openCamera('user');
    return stopStream;
  }, []);

  // Keep statusRef in sync
  useEffect(() => { statusRef.current = status; }, [status]);

  const startChallengeRef = useRef(startChallenge);
  useEffect(() => { startChallengeRef.current = startChallenge; }, [startChallenge]);

  const startVoiceListener = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (voiceRecRef.current) { try { voiceRecRef.current.abort(); } catch { /* ok */ } }

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.toLowerCase();
        if (text.includes('start') || text.includes('go') || text.includes('begin')) {
          try { rec.stop(); } catch { /* ok */ }
          voiceRecRef.current = null;
          setVoiceListening(false);
          startChallengeRef.current();
          return;
        }
      }
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (statusRef.current === 'preview') {
        try { rec.start(); } catch { setVoiceListening(false); voiceRecRef.current = null; }
      } else {
        setVoiceListening(false);
        voiceRecRef.current = null;
      }
    };

    voiceRecRef.current = rec;
    setVoiceListening(true);
    try { rec.start(); } catch { setVoiceListening(false); voiceRecRef.current = null; }
  }, []);

  // Clean up voice listener when leaving preview
  useEffect(() => {
    if (status !== 'preview' && voiceRecRef.current) {
      try { voiceRecRef.current.abort(); } catch { /* ok */ }
      voiceRecRef.current = null;
      setVoiceListening(false);
    }
  }, [status]);

  // Wrap talkToCoach to detect video requests
  const handleTalkToCoach = useCallback(async () => {
    const result = await talkToCoach();
    if (result?.transcript) {
      const lower = result.transcript.toLowerCase();
      if (lower.includes('video') || lower.includes('show me') || lower.includes('how to') || lower.includes('tutorial') || lower.includes('demonstrate')) {
        setShowVideo(true);
      }
    }
  }, [talkToCoach]);

  const progress = isReps
    ? Math.min((reps / (targetReps || 1)) * 100, 100)
    : Math.min((seconds / (targetSeconds || 1)) * 100, 100);

  const displayValue = isReps ? reps : seconds;
  const displayTarget = isReps ? targetReps : targetSeconds;
  const displayUnit = isReps ? 'reps' : 'sec';
  const displayFeedback = isReps ? repFeedback : formFeedback;

  return (
    <div className="camera-challenge">
      <div className="camera-viewport">
        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
        <canvas ref={canvasRef} className="camera-canvas" />

        {/* Camera controls */}
        {(status === 'preview' || status === 'running' || status === 'countdown') && (
          <button className="flip-cam-btn" onClick={flipCamera} title="Flip camera">
            <RefreshCw size={20} />
          </button>
        )}
        {status === 'running' && (
          <>
            <button
              className={`mic-btn ${muted ? 'mic-muted' : ''}`}
              onClick={() => setMuted(m => !m)}
              title={muted ? 'Unmute coach' : 'Mute coach'}
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            {!muted && (
              <button
                className={`ask-btn ${listening ? 'mic-listening' : ''}`}
                onClick={handleTalkToCoach}
                title="Ask coach a question"
              >
                <MessageCircle size={18} />
              </button>
            )}
          </>
        )}

        {/* Tutorial video button */}
        {(status === 'preview' || status === 'running') && exercise?.id && EXERCISE_VIDEOS[exercise.id] && (
          <button className="video-help-btn" onClick={() => setShowVideo(true)} title="Watch tutorial">
            <Video size={18} />
          </button>
        )}

        {/* Preview: position yourself, then tap or say Start */}
        {status === 'preview' && (
          <div className="cam-overlay preview-overlay">
            <p className="preview-text">Position yourself in frame</p>
            <button className="start-challenge-btn" onClick={startChallenge}>
              <Play size={22} fill="#fff" />
              <span>Start</span>
            </button>
            <button
              className={`voice-start-hint ${voiceListening ? 'voice-active' : ''}`}
              onClick={startVoiceListener}
            >
              <Mic size={14} />
              <span>{voiceListening ? 'Listening… say "Start"' : 'Tap to use voice'}</span>
            </button>
          </div>
        )}

        {/* Coach reply bubble */}
        {lastReply && status === 'running' && (
          <div className="coach-reply">
            <span>{lastReply}</span>
          </div>
        )}

        {/* Listening indicator */}
        {listening && (
          <div className="cam-overlay" style={{ background: 'rgba(124,58,237,0.15)' }}>
            <div className="listening-pulse" />
            <p style={{ marginTop: 12 }}>Listening...</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="cam-overlay">
            <div className="spinner" />
            <p>Loading AI model…</p>
          </div>
        )}
        {countdown !== null && (
          <div className="cam-overlay countdown-overlay">
            <span className="countdown-num">{countdown}</span>
          </div>
        )}
        {status === 'done' && (
          <div className="cam-overlay done-overlay">
            <span>✅</span>
            <p>Challenge complete!</p>
          </div>
        )}
        {status === 'running' && !poseDetected && (
          <div className="cam-overlay nudge-overlay">
            <p>Get fully in the frame</p>
          </div>
        )}
        {status === 'error' && (
          <div className="cam-overlay error-overlay">
            <p>⚠️ Camera unavailable</p>
            <small>{error}</small>
            {(error?.toLowerCase().includes('https') ||
              error?.toLowerCase().includes('permission') ||
              error?.toLowerCase().includes('notallowed')) && (
              <small style={{ marginTop: 8, color: '#f59e0b' }}>
                On iPhone, camera requires HTTPS.
              </small>
            )}
            <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => openCamera()}>
              Retry
            </button>
          </div>
        )}

        {/* Video tutorial modal */}
        {showVideo && exercise?.id && EXERCISE_VIDEOS[exercise.id] && (
          <div className="video-modal-overlay" onClick={() => setShowVideo(false)}>
            <div className="video-modal" onClick={(e) => e.stopPropagation()}>
              <button className="video-close-btn" onClick={() => setShowVideo(false)}>
                <X size={20} />
              </button>
              <iframe
                src={EXERCISE_VIDEOS[exercise.id]}
                title="Exercise tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="video-iframe"
              />
            </div>
          </div>
        )}
      </div>

      <div className="challenge-hud">
        <div className="hud-counter">
          <span className="hud-value">{displayValue}</span>
          <span className="hud-sep">/</span>
          <span className="hud-target">
            {displayTarget} {displayUnit}
          </span>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className="hud-feedback">{displayFeedback}</p>

        {currentAngle !== null && isReps && (
          <p className="hud-angle">Joint angle: {currentAngle}°</p>
        )}
      </div>
    </div>
  );
}
