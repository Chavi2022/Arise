export const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

export function getAngle(landmarks, idxA, idxB, idxC) {
  const a = landmarks[idxA];
  const b = landmarks[idxB];
  const c = landmarks[idxC];
  if (!a || !b || !c) return null;
  if ((a.visibility ?? 1) < 0.4 || (b.visibility ?? 1) < 0.4 || (c.visibility ?? 1) < 0.4)
    return null;
  return calculateAngle(a, b, c);
}

export function avg(...values) {
  const valid = values.filter((v) => v !== null && v !== undefined);
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}
