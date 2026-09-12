import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function SeedDataToggle() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSeed = async () => {
    if (!confirm('This will create demo employees and allocations. Proceed?')) return;
    setIsSeeding(true);
    try {
      const { error } = await supabase.rpc('seed_demo_data');
      if (error) throw error;
      toast.success('Demo data loaded successfully');
    } catch (error: any) {
      toast.error(`Failed to load demo data: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('This will delete all demo data. Proceed?')) return;
    setIsClearing(true);
    try {
      const { error } = await supabase.rpc('clear_demo_data');
      if (error) throw error;
      toast.success('Demo data cleared successfully');
    } catch (error: any) {
      toast.error(`Failed to clear demo data: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo Data</CardTitle>
        <CardDescription>
          Load or clear test data for demonstration purposes. This will create around 100 fake employees and fill the calendar with sample allocations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button onClick={handleSeed} disabled={isSeeding || isClearing} className="bg-blue-600 hover:bg-blue-700">
          {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Load Demo Dataset
        </Button>
        <Button onClick={handleClear} variant="destructive" disabled={isSeeding || isClearing}>
          {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Clear Demo Data
        </Button>
      </CardContent>
    </Card>
  );
}
