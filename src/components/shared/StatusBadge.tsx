import React from 'react';
import { AllocationStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';

interface StatusBadgeProps {
  status: AllocationStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors = {
    billable: 'bg-blue-100 text-blue-800',
    internal: 'bg-purple-100 text-purple-800',
    pto: 'bg-gray-100 text-gray-800',
    sick: 'bg-orange-100 text-orange-800',
    public_holiday: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]} ${className}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
