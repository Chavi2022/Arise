import { LANDMARKS, getAngle, avg } from './poseUtils';

export const EXERCISES = {
  PUSH_UP: {
    id: 'PUSH_UP',
    name: 'Push-ups',
    emoji: '🏋️',
    muscleGroup: 'Chest · Triceps · Shoulders',
    type: 'reps',
    defaultReps: 10,
    getAngle: (lm) =>
      avg(
        getAngle(lm, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST),
        getAngle(lm, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST)
      ),
    upAngle: 155,
    downAngle: 90,
    upLabel: 'Push up!',
    downLabel: 'Lower your chest',
    tips: ['Body in a straight line', 'Core tight the whole time', 'Full range of motion'],
  },
  SQUAT: {
    id: 'SQUAT',
    name: 'Squats',
    emoji: '🦵',
    muscleGroup: 'Quads · Glutes · Hamstrings',
    type: 'reps',
    defaultReps: 20,
    getAngle: (lm) =>
      avg(
        getAngle(lm, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE),
        getAngle(lm, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE)
      ),
    upAngle: 165,
    downAngle: 90,
    upLabel: 'Stand tall',
    downLabel: 'Go lower!',
    tips: ['Chest up, back straight', 'Knees track over toes', 'Drive through your heels'],
  },
  SIT_UP: {
    id: 'SIT_UP',
    name: 'Sit-ups',
    emoji: '🤸',
    muscleGroup: 'Abs · Hip Flexors',
    type: 'reps',
    defaultReps: 15,
    // Shoulder → hip → knee angle: ~170° lying flat, ~80° sitting up
    getAngle: (lm) =>
      avg(
        getAngle(lm, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE),
        getAngle(lm, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE)
      ),
    upAngle: 155,
    downAngle: 80,
    upLabel: 'Lie back down',
    downLabel: 'Sit all the way up',
    tips: ['Feet flat on the ground', 'Hands behind head, elbows wide', 'Control the descent'],
  },
  PLANK: {
    id: 'PLANK',
    name: 'Plank',
    emoji: '🧘',
    muscleGroup: 'Core · Shoulders · Back',
    type: 'hold',
    defaultSeconds: 60,
    // Shoulder → hip → ankle: straight body = ~175–195°
    getAngle: (lm) =>
      avg(
        getAngle(lm, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ANKLE),
        getAngle(lm, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_ANKLE)
      ),
    goodMin: 160,
    goodMax: 200,
    tips: ['Hips level — not sagging or raised', 'Look at the floor, neutral neck', 'Squeeze glutes and abs'],
  },
};

export const EXERCISE_LIST = Object.values(EXERCISES);
