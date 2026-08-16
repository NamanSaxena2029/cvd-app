import { AlertTriangle } from 'lucide-react';

export default function Disclaimer({ compact = false }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 ${
        compact ? 'p-3 text-xs' : 'p-4 text-sm'
      }`}
    >
      <AlertTriangle size={compact ? 16 : 20} className="mt-0.5 flex-shrink-0" />
      <p>
        This application provides a <strong>preliminary, non-clinical screening</strong> and is{' '}
        <strong>not a medical diagnosis</strong>. For professional evaluation, consult a qualified
        eye-care professional.
      </p>
    </div>
  );
}
