import { Profile, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PendingApprovalsProps {
  profiles: Profile[];
  onApprove: (id: string, role: UserRole, deptId: string | null) => void;
  onReject: (id: string) => void;
}

export function PendingApprovals({ profiles, onApprove, onReject }: PendingApprovalsProps) {
  if (profiles.length === 0) return null;

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-amber-800 flex items-center gap-2">
          Pending Approvals
          <Badge variant="secondary" className="bg-amber-200 text-amber-900">{profiles.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profiles.map(profile => (
          <div key={profile.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-amber-100">
            <div>
              <p className="font-medium text-sm">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => onReject(profile.id)}>
                Reject
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(profile.id, 'employee', profile.department_id)}>
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
