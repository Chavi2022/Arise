import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarker = null;
let landmarkerPromise = null;

/**
 * Returns the singleton PoseLandmarker, loading it if needed.
 * Safe to call multiple times — only one load runs at a time.
 */
export function getPoseLandmarker() {
  if (landmarker) return Promise.resolve(landmarker);
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
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
    return landmarker;
  })();

  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });

  return landmarkerPromise;
}

/**
 * Fire-and-forget preload — call early so the model is warm
 * by the time the user reaches the camera screen.
 */
export function preloadPoseLandmarker() {
  getPoseLandmarker().catch(() => {});
}
