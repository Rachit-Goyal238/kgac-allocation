import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace TableRow with Dialog wrapped row
old_row = """              <TableBody>
                {attendanceData.map(d => (
                  <TableRow key={d.id} className="hover:bg-slate-50">"""

new_row = """              <TableBody>
                {attendanceData.map(d => (
                  <React.Fragment key={d.id}>
                    <TableRow className="hover:bg-slate-50">"""

text = text.replace(old_row, new_row)

old_cells = """                    <TableCell className="text-right font-medium">{d.totalHours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>"""

new_cells = """                    <TableCell className="text-right font-medium">{d.totalHours}</TableCell>
                    <TableCell className="text-right">
                      <AttendanceDetailsDialog 
                        user={d}
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                      />
                    </TableCell>
                  </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>"""

text = text.replace(old_cells, new_cells)

# Add imports for dialog
import_add = """import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';"""

text = text.replace("import { Loader2", import_add + "\nimport { Loader2")

# Add the Dialog component definition at the bottom of the file
dialog_comp = """

function AttendanceDetailsDialog({ user, startDate, endDate }: { user: any, startDate: Date, endDate: Date }) {
  const [open, setOpen] = useState(false);
  const startStr = format(startDate, 'MMM d, yyyy');
  const endStr = format(endDate, 'MMM d, yyyy');

  // Combine records and leaves into a single timeline
  const timeline = [];
  
  if (user.records) {
    user.records.forEach((r: any) => {
      timeline.push({
        date: new Date(r.date),
        type: 'presence',
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        notes: r.notes
      });
    });
  }
  if (user.leaves) {
    user.leaves.forEach((l: any) => {
      timeline.push({
        date: new Date(l.allocation_date),
        type: 'leave',
        status: l.status
      });
    });
  }

  // Sort descending by date
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="hidden sm:inline">Details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {user.name} - Attendance Log
          </DialogTitle>
          <p className="text-sm text-slate-500">{startStr} to {endStr}</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto mt-4 pr-2">
          {timeline.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No attendance or leave records in this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((t: any, i: number) => {
                  let hours = 0;
                  if (t.type === 'presence' && t.clock_in && t.clock_out) {
                    const ms = new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime();
                    hours = Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
                  }
                  
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{format(t.date, 'EEE, MMM d')}</TableCell>
                      <TableCell>
                        {t.type === 'presence' ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Present</span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium uppercase">{t.status?.replace('_', ' ')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {t.type === 'presence' && t.clock_in ? format(new Date(t.clock_in), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {t.type === 'presence' && t.clock_out ? format(new Date(t.clock_out), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.type === 'presence' && hours > 0 ? `${hours}h` : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
"""

text = text + dialog_comp

# Add empty header cell for the button column
text = text.replace("<TableHead className=\"text-right\">Total Hours</TableHead>\n                </TableRow>", "<TableHead className=\"text-right\">Total Hours</TableHead>\n                  <TableHead className=\"text-right w-[100px]\"></TableHead>\n                </TableRow>")

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated AttendancePage.tsx with details dialog")
