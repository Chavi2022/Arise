import { useState, useRef, useCallback } from 'react';

export function useRepCounter() {
  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState(null);
  const [feedback, setFeedback] = useState('Get in position!');
  const [currentAngle, setCurrentAngle] = useState(null);

  const stageRef = useRef(null);
  const repsRef = useRef(0);
  const readyRef = useRef(false);
  const stableFramesRef = useRef(0);

  const processRepAngle = useCallback((angle, exercise) => {
    if (angle === null || angle === undefined || !exercise) return;
    setCurrentAngle(Math.round(angle));

    const { upAngle, downAngle, upLabel, downLabel } = exercise;

    // Require 5 stable frames in 'up' position before tracking
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

    if (angle > upAngle) {
      if (stageRef.current === 'down') {
        repsRef.current += 1;
        setReps(repsRef.current);
        setFeedback('Rep complete!');
      } else if (stageRef.current !== 'up') {
        setFeedback(downLabel ?? 'Start moving');
      }
      stageRef.current = 'up';
      setStage('up');
    } else if (angle < downAngle) {
      if (stageRef.current !== 'down') {
        setFeedback(upLabel ?? 'Come back up');
      }
      stageRef.current = 'down';
      setStage('down');
    } else {
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
