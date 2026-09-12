import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IdleDayEntry } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useDepartments } from '@/hooks/useProfiles';

interface IdleDaysTableProps {
  entries: IdleDayEntry[];
}

export function IdleDaysTable({ entries }: IdleDaysTableProps) {
  const { data: departments } = useDepartments();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees with Idle Days</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No idle days found — great team utilization!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Idle Days</TableHead>
                <TableHead className="text-right">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.userId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(entry.employee.full_name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      {entry.employee.full_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {departments?.find(d => d.id === entry.employee.department_id)?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">{entry.idleDaysCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{entry.lastActiveDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
