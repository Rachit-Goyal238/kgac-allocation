import React from 'react';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(parseISO(e.target.value), endDate);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(startDate, parseISO(e.target.value));
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 bg-background border border-input rounded-md px-3 h-10">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Start:</span>
        <input 
          type="date" 
          className="bg-transparent border-none text-sm outline-none w-[120px]"
          value={format(startDate, 'yyyy-MM-dd')} 
          onChange={handleStartChange} 
        />
      </div>
      <div className="flex items-center space-x-2 bg-background border border-input rounded-md px-3 h-10">
        <span className="text-sm text-muted-foreground whitespace-nowrap">End:</span>
        <input 
          type="date" 
          className="bg-transparent border-none text-sm outline-none w-[120px]"
          value={format(endDate, 'yyyy-MM-dd')} 
          onChange={handleEndChange} 
        />
      </div>
    </div>
  );
}
