'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  labels: string[];
}

export default function ProgressBar({ current, total, labels }: ProgressBarProps) {
  const percentage = ((current) / total) * 100;

  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2 text-xs text-gray-500">
        <span>{labels[current - 1]}</span>
        <span>{current} / {total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: '#14252A' }}
        />
      </div>
    </div>
  );
}
