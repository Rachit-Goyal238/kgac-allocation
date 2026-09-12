import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OverAllocationEntry } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface OverAllocationChartProps {
  entries: OverAllocationEntry[];
}

export function OverAllocationChart({ entries }: OverAllocationChartProps) {
  const chartData = entries.slice(0, 10).map(e => ({
    name: e.employee.full_name.split(' ')[0],
    days: e.overAllocatedDays
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Over-Allocation Frequency (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex h-[300px] items-center justify-center">
            No over-allocated members in this period.
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <RechartsTooltip />
                <Bar dataKey="days" name="Over-Allocated Days" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
