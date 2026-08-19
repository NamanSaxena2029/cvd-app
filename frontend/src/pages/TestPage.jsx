import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSession, submitAnswer, completeTest } from '../services/testService';
import Button from '../components/Button';

function apiBase() {
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
}

export default function TestPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState(location.state?.initial || null);
  const [loading, setLoading] = useState(!location.state?.initial);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [leaveWarningShown, setLeaveWarningShown] = useState(false);

  const timerRef = useRef(null);
  const hasAutoSubmitted = useRef(false);

  // Load / resume session if we don't have initial state (e.g. on refresh)
  useEffect(() => {
    if (state) return;
    setLoading(true);
    getSession(sessionId)
      .then((data) => {
        if (data.status && data.status !== 'in_progress') {
          navigate('/dashboard');
          return;
        }
        setState(data);
      })
      .catch(() => setError('Could not resume this test session. It may have expired.'))
      .finally(() => setLoading(false));
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start countdown whenever a new question is served
  useEffect(() => {
    if (!state?.allowedTimeSeconds) return;
    hasAutoSubmitted.current = false;
    setTimeLeft(state.allowedTimeSeconds);
    setAnswer('');

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [state?.currentRound, state?.currentQuestionIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving mid-test
  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const peekUrl = state?.question?.peekNextImageUrl;
    if (!peekUrl) return;
    const img = new Image();
    img.src = `${apiBase()}${peekUrl}`;
  }, [state?.question?.peekNextImageUrl]);

  const handleSubmit = useCallback(
    async (opts = {}) => {
      if (submitting) return;
      setSubmitting(true);
      setError('');
      try {
        const res = await submitAnswer(sessionId, {
          answer: opts.isSkip ? '' : answer,
          isSkip: !!opts.isSkip,
        });

        if (res.testComplete) {
          clearInterval(timerRef.current);
          const result = await completeTest(sessionId);
          navigate(`/result/${result._id}`, { state: { result } });
          return;
        }

        setState((prev) => ({
          ...prev,
          currentRound: res.nextQuestion.currentRound,
          currentQuestionIndex: res.nextQuestion.currentQuestionIndex,
          allowedTimeSeconds: res.nextQuestion.allowedTimeSeconds,
          question: res.nextQuestion.question,
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Could not submit answer. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [answer, sessionId, submitting, navigate]
  );

  // Auto-submit as timeout when the clock hits 0
  useEffect(() => {
    if (timeLeft === 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleSubmit({ isSkip: false });
    }
  }, [timeLeft, handleSubmit]);

  if (loading) {
    return <div className="flex h-[70vh] items-center justify-center text-slate-500">Loading test...</div>;
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button onClick={() => navigate('/instructions')}>Back to Instructions</Button>
      </div>
    );
  }

  if (!state) return null;

  const { currentRound, currentQuestionIndex, question, allowedTimeSeconds } = state;
  const progressPct = (currentQuestionIndex / 10) * 100;
  const urgent = timeLeft !== null && timeLeft <= 3;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-4 py-8">
      {/* Top: status bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span>Round {currentRound} of 3</span>
          <span>Question {currentQuestionIndex + 1} / 10</span>
          <span className={urgent ? 'font-semibold text-red-600' : ''}>
            Time remaining: {String(timeLeft ?? allowedTimeSeconds).padStart(2, '0')}s
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Center: image, neutral background, no filters/overlays */}
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
        {question && (
          <img
            src={`${apiBase()}${question.imageUrl}`}
            alt="Ishihara test plate"
            className="max-h-[320px] w-auto object-contain"
            style={{ filter: 'none' }}
            draggable={false}
          />
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Below: answer input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mt-8 flex w-full max-w-sm flex-col items-center gap-3"
        >
          <input
            autoFocus
            inputMode="numeric"
            placeholder="Enter the number you see"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg focus-ring"
          />
          <div className="flex w-full gap-3">
            <Button type="submit" disabled={submitting || !answer} className="flex-1">
              Submit Answer
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleSubmit({ isSkip: true })}
              className="flex-1"
            >
              No Visible Number
            </Button>
          </div>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Do not change your display's brightness, contrast, or color settings during the test.
      </p>
    </div>
  );
}
