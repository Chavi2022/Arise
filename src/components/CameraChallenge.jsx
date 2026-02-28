import { useRef, useEffect, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { RefreshCw } from 'lucide-react';
import { useRepCounter, usePlankTimer } from '../hooks/useRepCounter';

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
  // Store the current facingMode in a ref so frameLoop always knows whether to mirror
  const facingModeRef = useRef('user');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = rear

  const isReps = exercise?.type === 'reps';

  const { reps, feedback: repFeedback, currentAngle, processRepAngle, reset: resetReps } =
    useRepCounter();
  const { seconds, formFeedback, processPlankAngle, reset: resetPlank } = usePlankTimer();

  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);
  useEffect(() => { processRepAngleRef.current = processRepAngle; }, [processRepAngle]);
  useEffect(() => { processPlankAngleRef.current = processPlankAngle; }, [processPlankAngle]);
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
        // Mirror landmark x-coordinates only for front camera
        const displayLandmarks = isFront
          ? landmarks.map((l) => ({ ...l, x: 1 - l.x }))
          : landmarks;

        drawingUtils.drawConnectors(displayLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: '#a855f780',
          lineWidth: 3,
        });
        drawingUtils.drawLandmarks(displayLandmarks, {
          color: '#a855f7',
          fillColor: '#ffffff20',
          radius: 4,
          lineWidth: 1,
        });

        const ex = exerciseRef.current;
        if (ex) {
          // Always use original (unmirrored) landmarks for angle calculation
          const angle = ex.getAngle(landmarks);
          if (ex.type === 'reps') processRepAngleRef.current?.(angle, ex);
          else processPlankAngleRef.current?.(angle, ex);
        }
      } else {
        setPoseDetected(false);
      }
    }

    rafRef.current = requestAnimationFrame(frameLoop);
  }, []);

  const startCamera = useCallback(async (facing = facingModeRef.current) => {
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

      setStatus('countdown');
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);
      setStatus('running');
      runningRef.current = true;
      frameLoop();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [frameLoop, stopStream]);

  // Flip camera without resetting reps/plank timer
  const flipCamera = useCallback(() => {
    const next = facingModeRef.current === 'user' ? 'environment' : 'user';
    facingModeRef.current = next;
    setFacingMode(next);
    startCamera(next);
  }, [startCamera]);

  useEffect(() => {
    completedRef.current = false;
    resetReps();
    resetPlank();
    startCamera('user');
    return stopStream;
  }, []);

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

        {/* Flip camera button — always visible when camera is running */}
        {(status === 'running' || status === 'countdown') && (
          <button className="flip-cam-btn" onClick={flipCamera} title="Flip camera">
            <RefreshCw size={20} />
          </button>
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
            <p>Step into frame 👆</p>
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
            <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => startCamera()}>
              Retry
            </button>
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
