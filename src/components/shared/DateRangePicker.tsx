import React from 'react';
import { format, parseISO } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const newStart = parseISO(e.target.value);
      // If start date is moved beyond current end date, advance end date as well
      if (newStart > endDate) {
        onChange(newStart, newStart);
      } else {
        onChange(newStart, endDate);
      }
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const newEnd = parseISO(e.target.value);
      // Hard guard: End date cannot be set before start date
      if (newEnd < startDate) {
        onChange(startDate, startDate);
      } else {
        onChange(startDate, newEnd);
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 bg-background border border-input rounded-md px-3 h-10">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Start:</span>
        <input 
          type="date" 
          className="bg-transparent border-none text-sm outline-none w-[120px]"
          value={startStr} 
          max={endStr}
          onChange={handleStartChange} 
        />
      </div>
      <div className="flex items-center space-x-2 bg-background border border-input rounded-md px-3 h-10">
        <span className="text-sm text-muted-foreground whitespace-nowrap">End:</span>
        <input 
          type="date" 
          className="bg-transparent border-none text-sm outline-none w-[120px]"
          value={endStr} 
          min={startStr}
          onChange={handleEndChange} 
        />
      </div>
    </div>
  );
}
