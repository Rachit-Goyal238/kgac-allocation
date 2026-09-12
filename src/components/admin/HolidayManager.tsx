import { useState } from 'react';
import { useBlanketHolidays, useCreateBlanketHoliday, useDeleteBlanketHoliday } from '@/hooks/useBlanketHolidays';
import { BlanketHoliday } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, Calendar } from 'lucide-react';
import { DatePicker } from '@/components/shared/DatePicker';
import { format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

export function HolidayManager() {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const { profile } = useAuthContext();

  const { data: holidays, isLoading } = useBlanketHolidays();
  const createHoliday = useCreateBlanketHoliday();
  const deleteHoliday = useDeleteBlanketHoliday();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason || !profile?.id) return;
    createHoliday.mutate({
      date,
      reason,
      created_by: profile.id
    }, {
      onSuccess: () => {
        setDate('');
        setReason('');
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Declare Blanket Holiday</CardTitle>
          <CardDescription>Mark a date as a company-wide off day.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="date">Date</Label>
              <DatePicker 
                date={date ? new Date(date) : undefined} 
                onSelect={(d) => setDate(d ? format(d, 'yyyy-MM-dd') : '')} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Name</Label>
              <Input id="reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Company Retreat" required />
            </div>
            <Button type="submit" className="w-full" disabled={createHoliday.isPending || !date || !reason}>
              {createHoliday.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Declare Holiday
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Manage Blanket Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!holidays || holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No blanket holidays declared</TableCell>
                  </TableRow>
                ) : (
                  holidays.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(h.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{h.reason}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { if(confirm('Delete holiday?')) deleteHoliday.mutate(h.id); }}
                          disabled={deleteHoliday.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
