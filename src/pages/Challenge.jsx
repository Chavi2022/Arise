import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import CameraChallenge from '../components/CameraChallenge';
import { EXERCISES, EXERCISE_LIST } from '../utils/exerciseConfig';
import { getSettings, grantUnlock } from '../utils/storage';

const STEPS = { PICK: 'pick', INTRO: 'intro', CAMERA: 'camera', SUCCESS: 'success' };

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Challenge() {
  const location = useLocation();
  const navigate = useNavigate();
  const app = location.state?.app ?? null;

  const settings = getSettings();
  const [step, setStep] = useState(app ? STEPS.INTRO : STEPS.PICK);
  const [chosenExercise, setChosenExercise] = useState(() => {
    // Auto-pick a random exercise when coming from an app lock
    return app ? pickRandom(EXERCISE_LIST) : null;
  });
  const [unlockExpiry, setUnlockExpiry] = useState(null);
  const [countdown, setCountdown] = useState(settings.unlockMinutes * 60);

  const targetReps =
    chosenExercise?.type === 'reps'
      ? settings.reps?.[chosenExercise.id] ?? chosenExercise.defaultReps
      : null;
  const targetSeconds =
    chosenExercise?.type === 'hold'
      ? settings.seconds?.PLANK ?? chosenExercise.defaultSeconds
      : null;

  // Countdown timer once unlocked
  useEffect(() => {
    if (step !== STEPS.SUCCESS || !unlockExpiry) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.floor((unlockExpiry - Date.now()) / 1000));
      setCountdown(rem);
      if (rem === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [step, unlockExpiry]);

  const handleComplete = () => {
    let expiry = null;
    if (app) {
      expiry = grantUnlock(app.id, settings.unlockMinutes);
    }
    setUnlockExpiry(expiry ?? Date.now() + settings.unlockMinutes * 60 * 1000);
    setStep(STEPS.SUCCESS);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page challenge-page">
      {/* Header */}
      <div className="challenge-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="page-title">
          {app ? `Unlock ${app.name}` : 'Challenge'}
        </h1>
        <div style={{ width: 40 }} />
      </div>

      {/* STEP: pick exercise */}
      {step === STEPS.PICK && (
        <div className="step-pick">
          <p className="section-desc" style={{ textAlign: 'center', marginBottom: 24 }}>
            Choose an exercise to complete.
          </p>
          <div className="exercise-grid">
            {EXERCISE_LIST.map((ex) => (
              <button
                key={ex.id}
                className="exercise-card"
                onClick={() => { setChosenExercise(ex); setStep(STEPS.INTRO); }}
              >
                <span className="ex-emoji">{ex.emoji}</span>
                <span className="ex-name">{ex.name}</span>
                <span className="ex-target">
                  {ex.type === 'reps'
                    ? `${settings.reps?.[ex.id] ?? ex.defaultReps} reps`
                    : `${settings.seconds?.PLANK ?? ex.defaultSeconds} sec`}
                </span>
                <span className="ex-muscle">{ex.muscleGroup}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: intro */}
      {step === STEPS.INTRO && chosenExercise && (
        <div className="step-intro">
          {app && (
            <div className="locked-app-banner">
              <span className="app-emoji-large">{app.emoji}</span>
              <div>
                <p className="locked-label">Locked</p>
                <p className="locked-name">{app.name}</p>
              </div>
            </div>
          )}

          <div className="intro-card">
            <span className="intro-emoji">{chosenExercise.emoji}</span>
            <h2 className="intro-title">{chosenExercise.name}</h2>
            <div className="intro-target">
              {chosenExercise.type === 'reps' ? (
                <>
                  <span className="intro-num">{targetReps}</span>
                  <span className="intro-unit">reps</span>
                </>
              ) : (
                <>
                  <span className="intro-num">{targetSeconds}</span>
                  <span className="intro-unit">seconds</span>
                </>
              )}
            </div>
            <p className="intro-desc">{chosenExercise.description}</p>

            <ul className="tips-list">
              {chosenExercise.tips.map((tip, i) => (
                <li key={i}>
                  <span className="tip-check">✓</span> {tip}
                </li>
              ))}
            </ul>

            {app && (
              <p className="intro-reward">
                Complete this to unlock <strong>{app.name}</strong> for{' '}
                <strong>{settings.unlockMinutes} minutes</strong>.
              </p>
            )}
          </div>

          <button className="btn-primary full-width" onClick={() => setStep(STEPS.CAMERA)}>
            Start Challenge
          </button>
          {!app && (
            <button className="btn-ghost full-width" style={{ marginTop: 8 }} onClick={() => setStep(STEPS.PICK)}>
              Choose Different Exercise
            </button>
          )}
        </div>
      )}

      {/* STEP: camera */}
      {step === STEPS.CAMERA && chosenExercise && (
        <div className="step-camera">
          <CameraChallenge
            exercise={chosenExercise}
            targetReps={targetReps}
            targetSeconds={targetSeconds}
            onComplete={handleComplete}
          />
          <button
            className="btn-ghost full-width"
            style={{ marginTop: 12 }}
            onClick={() => setStep(STEPS.INTRO)}
          >
            ← Back
          </button>
        </div>
      )}

      {/* STEP: success */}
      {step === STEPS.SUCCESS && (
        <div className="step-success">
          <div className="success-icon">
            <CheckCircle size={72} strokeWidth={1.5} color="#10b981" />
          </div>
          <h2 className="success-title">Challenge Complete! 🎉</h2>
          {chosenExercise && (
            <p className="success-exercise">
              {chosenExercise.emoji} {chosenExercise.type === 'reps' ? `${targetReps} ${chosenExercise.name}` : `${targetSeconds}s ${chosenExercise.name}`}
            </p>
          )}

          {app && (
            <div className="success-unlock-card">
              <span className="app-emoji-large">{app.emoji}</span>
              <div>
                <p className="success-app-name">{app.name} is unlocked</p>
                <p className="success-timer">{formatTime(countdown)} remaining</p>
              </div>
            </div>
          )}

          {!app && (
            <p className="section-desc" style={{ textAlign: 'center' }}>
              Great work! Keep building that habit.
            </p>
          )}

          <button className="btn-primary full-width" style={{ marginTop: 32 }} onClick={() => navigate('/')}>
            Back to Dashboard
          </button>

          <button
            className="btn-ghost full-width"
            style={{ marginTop: 8 }}
            onClick={() => {
              setChosenExercise(pickRandom(EXERCISE_LIST));
              setStep(STEPS.INTRO);
            }}
          >
            Do Another Exercise
          </button>
        </div>
      )}
    </div>
  );
}
