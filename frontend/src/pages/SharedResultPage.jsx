import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import Disclaimer from '../components/Disclaimer';
import { getSharedResult } from '../services/resultService';

export default function SharedResultPage() {
  const { shareToken } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSharedResult(shareToken)
      .then(setResult)
      .catch(() => setError('This shared result could not be found.'));
  }, [shareToken]);

  if (error) return <div className="mx-auto max-w-md px-4 py-16 text-center text-red-600">{error}</div>;
  if (!result) return <div className="flex h-[70vh] items-center justify-center text-slate-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Shared Screening Result</h1>
      <Card className="mb-6">
        <p className="mb-2 text-sm text-slate-500">
          Completed on {new Date(result.completedAt).toLocaleString()}
        </p>
        <p className="mb-1">
          Score: <strong>{result.correctCount}/{result.totalQuestions}</strong> ({Math.round(result.overallAccuracy * 100)}%)
        </p>
        <p className="mt-3 text-slate-700">{result.explanation}</p>
      </Card>
      <Disclaimer />
    </div>
  );
}
