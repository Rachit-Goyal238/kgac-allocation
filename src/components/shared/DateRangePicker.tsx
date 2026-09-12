import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const date = { from: startDate, to: endDate };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className="justify-start text-left font-normal w-[260px]"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(startDate, "LLL dd, y")} - {format(endDate, "LLL dd, y")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 scale-90 origin-top-right" align="end">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={startDate}
          selected={date}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onChange(range.from, range.to);
            }
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
