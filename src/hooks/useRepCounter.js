import { useState, useRef, useCallback } from 'react';

const DEBOUNCE_FRAMES = 4;
const REP_COOLDOWN_MS = 800;

export function useRepCounter() {
  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState(null);
  const [feedback, setFeedback] = useState('Get in position!');
  const [currentAngle, setCurrentAngle] = useState(null);

  const stageRef = useRef(null);
  const repsRef = useRef(0);
  const readyRef = useRef(false);
  const stableFramesRef = useRef(0);
  const downFramesRef = useRef(0);
  const upFramesRef = useRef(0);
  const lastRepTimeRef = useRef(0);
  const hitDownRef = useRef(false);

  const processRepAngle = useCallback((angle, exercise) => {
    if (angle === null || angle === undefined || !exercise) return;
    setCurrentAngle(Math.round(angle));

    const { upAngle, downAngle, upLabel, downLabel } = exercise;

    if (!readyRef.current) {
      if (angle > upAngle) {
        stableFramesRef.current += 1;
        if (stableFramesRef.current >= 5) {
          readyRef.current = true;
          stageRef.current = 'up';
          setStage('up');
          setFeedback('Ready — go!');
        } else {
          setFeedback('Get in position!');
        }
      } else {
        stableFramesRef.current = 0;
        setFeedback('Get in position!');
      }
      return;
    }

    if (angle < downAngle) {
      downFramesRef.current += 1;
      upFramesRef.current = 0;
      if (downFramesRef.current >= DEBOUNCE_FRAMES && stageRef.current !== 'down') {
        stageRef.current = 'down';
        hitDownRef.current = true;
        setStage('down');
        setFeedback(upLabel ?? 'Come back up');
      }
    } else if (angle > upAngle) {
      upFramesRef.current += 1;
      downFramesRef.current = 0;
      if (upFramesRef.current >= DEBOUNCE_FRAMES && stageRef.current !== 'up') {
        const now = Date.now();
        if (hitDownRef.current && (now - lastRepTimeRef.current) > REP_COOLDOWN_MS) {
          repsRef.current += 1;
          setReps(repsRef.current);
          setFeedback('Rep complete!');
          lastRepTimeRef.current = now;
          hitDownRef.current = false;
        }
        stageRef.current = 'up';
        setStage('up');
      }
    } else {
      downFramesRef.current = 0;
      upFramesRef.current = 0;
      if (stageRef.current === 'down') {
        setFeedback('Coming up…');
      } else if (stageRef.current === 'up') {
        setFeedback('Going down…');
      }
    }
  }, []);

  const reset = useCallback(() => {
    setReps(0);
    setStage(null);
    setFeedback('Get in position!');
    setCurrentAngle(null);
    stageRef.current = null;
    repsRef.current = 0;
    readyRef.current = false;
    stableFramesRef.current = 0;
    downFramesRef.current = 0;
    upFramesRef.current = 0;
    lastRepTimeRef.current = 0;
    hitDownRef.current = false;
  }, []);

  return { reps, stage, feedback, currentAngle, processRepAngle, reset };
}

export function usePlankTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [formFeedback, setFormFeedback] = useState('Get into plank position');

  const intervalRef = useRef(null);
  const holdingRef = useRef(false);

  const processPlankAngle = useCallback((angle, exercise) => {
    if (angle === null || !exercise) {
      if (holdingRef.current) {
        clearInterval(intervalRef.current);
        holdingRef.current = false;
        setIsHolding(false);
        setFormFeedback('Step back into frame');
      }
      return;
    }

    const { goodMin, goodMax } = exercise;
    const inPosition = angle >= goodMin && angle <= goodMax;

    if (inPosition && !holdingRef.current) {
      holdingRef.current = true;
      setIsHolding(true);
      setFormFeedback('Hold it! 🔥');
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!inPosition && holdingRef.current) {
      clearInterval(intervalRef.current);
      holdingRef.current = false;
      setIsHolding(false);
      if (angle < goodMin) setFormFeedback('Hips too low — lift them up');
      else setFormFeedback('Hips too high — lower them');
    } else if (!inPosition) {
      if (angle < goodMin) setFormFeedback('Hips sagging — engage your core');
      else setFormFeedback('Hips too high — lower them');
    }
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    holdingRef.current = false;
    setSeconds(0);
    setIsHolding(false);
    setFormFeedback('Get into plank position');
  }, []);

  return { seconds, isHolding, formFeedback, processPlankAngle, reset };
}
