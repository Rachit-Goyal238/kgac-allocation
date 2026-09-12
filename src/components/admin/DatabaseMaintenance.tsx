import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Database, Archive } from 'lucide-react';
import { format, subMonths } from 'date-fns';

export function DatabaseMaintenance() {
  const [isArchiving, setIsArchiving] = useState(false);
  const [monthsToKeep, setMonthsToKeep] = useState('12');

  const handleArchive = async () => {
    const months = parseInt(monthsToKeep, 10);
    if (isNaN(months) || months < 1) {
      toast.error('Please enter a valid number of months');
      return;
    }

    const cutoffDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');

    if (!confirm(`Are you sure you want to archive allocations older than ${cutoffDate}? This action cannot be easily undone.`)) {
      return;
    }

    setIsArchiving(true);
    try {
      const { data, error } = await supabase.rpc('archive_old_allocations', {
        cutoff_date: cutoffDate
      });

      if (error) throw error;
      toast.success(`Successfully archived ${data || 0} allocation rows`);
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-500" />
            Data Archiving
          </CardTitle>
          <CardDescription>
            Move old allocation records to the archive table to improve query performance for current data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="months">Keep data for the last (months)</Label>
              <Input 
                id="months" 
                type="number" 
                min="1" 
                value={monthsToKeep} 
                onChange={(e) => setMonthsToKeep(e.target.value)} 
                className="w-32"
              />
            </div>
            <Button onClick={handleArchive} disabled={isArchiving} variant="secondary">
              {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Run Archive Process
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Archived records are moved to the <code>archived_allocations</code> table and are excluded from standard reporting and grid views to keep the application fast.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
