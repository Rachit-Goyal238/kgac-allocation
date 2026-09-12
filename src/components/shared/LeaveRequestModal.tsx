import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/shared/DatePicker';
import { useCreateLeaveRequest } from '@/hooks/useLeaveRequests';
import { useAuthContext } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Loader2, CalendarHeart } from 'lucide-react';

export function LeaveRequestModal() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<'sick' | 'pto'>('pto');
  
  const { profile } = useAuthContext();
  const createLeave = useCreateLeaveRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !startDate || !endDate) return;

    createLeave.mutate({
      user_id: profile.id,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      type,
      manager_id: profile.department_id, // simplified mapping
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <CalendarHeart className="mr-2 h-4 w-4" />
          Request Leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label>Start Date</Label>
              <DatePicker date={startDate} onSelect={setStartDate} />
            </div>
            <div className="space-y-2 flex flex-col">
              <Label>End Date</Label>
              <DatePicker date={endDate} onSelect={setEndDate} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={type} onValueChange={(v: 'sick' | 'pto') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pto">PTO / Vacation</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={createLeave.isPending || !startDate || !endDate}>
            {createLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
