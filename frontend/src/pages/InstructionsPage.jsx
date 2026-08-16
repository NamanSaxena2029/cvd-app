import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import Disclaimer from '../components/Disclaimer';
import { startTest } from '../services/testService';

const INSTRUCTIONS = [
  'Each image contains a number or pattern made of colored dots.',
  'Type what you see into the answer box, or use "No Visible Number" if you cannot see one.',
  'Each question has a limited response time — answer before the countdown ends.',
  'There are 3 rounds of 10 questions each (30 questions total).',
  'Response time gets shorter in later rounds.',
  'Some plates may not contain a visible number for certain users — that is expected.',
  'Do not use external assistance (color-picker tools, other people, etc.).',
  'Keep your display brightness at a comfortable, normal level.',
  'Avoid changing display settings (brightness, night mode, filters) during the test.',
];

export default function InstructionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const data = await startTest();
      navigate(`/test/${data.sessionId}`, { state: { initial: data } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the test. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-slate-800">Before You Begin</h1>
      <p className="mb-6 text-slate-500">Please read these instructions carefully.</p>

      <Card>
        <ul className="space-y-3">
          {INSTRUCTIONS.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6">
        <Disclaimer />
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-8 flex justify-center">
        <Button onClick={handleStart} disabled={loading} className="px-8 py-3 text-base">
          {loading ? 'Preparing test...' : 'Start Test'}
        </Button>
      </div>
    </div>
  );
}
