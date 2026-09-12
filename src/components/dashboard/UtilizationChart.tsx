import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

interface UtilizationChartProps {
  data: Array<{ date: string; billableHours: number; internalHours: number; ptoHours: number; utilization: number }>;
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Daily Utilization Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <RechartsTooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="billableHours" name="Billable" stackId="a" fill="#3b82f6" />
              <Bar yAxisId="left" dataKey="internalHours" name="Internal" stackId="a" fill="#8b5cf6" />
              <Bar yAxisId="left" dataKey="ptoHours" name="PTO/Leave" stackId="a" fill="#9ca3af" />
              <Line yAxisId="right" type="monotone" dataKey="utilization" name="Utilization %" stroke="#10b981" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
