import React, { useState } from 'react';
import { useAudits, useAuditTeams, useAssignTeamMember, useRemoveTeamMember, useUpdateAudit, useDeleteAudit } from '@/hooks/useAudits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Trash2, Building, User } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function TeamBuilder() {
  const { data: audits, isLoading: isLoadingAudits } = useAudits();
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const { data: team, isLoading: isLoadingTeam } = useAuditTeams(selectedAuditId || undefined);
  const assignMember = useAssignTeamMember();
  const removeMember = useRemoveTeamMember();
  const updateAudit = useUpdateAudit();
  const deleteAudit = useDeleteAudit();

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);

  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: async () => {
    const { data } = await supabase.from('vendors').select('*'); return data;
  }});
  const { data: employees } = useQuery({ queryKey: ['profiles'], queryFn: async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'active'); return data;
  }});

  const selectedAudit = audits?.find(a => a.id === selectedAuditId);
  const assignedLeads = team?.filter(m => m.role === 'lead').length || 0;
  const assignedExecs = team?.filter(m => m.role === 'executive').length || 0;
  const reqLeads = selectedAudit?.required_leads || 0;
  const reqExecs = selectedAudit?.required_executives || 0;
  const isTeamSatisfied = (assignedLeads >= reqLeads) && (assignedExecs >= reqExecs);
  const requirementsMet = reqLeads > 0 || reqExecs > 0 ? isTeamSatisfied : true;

  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState<'lead' | 'executive' | 'asset'>('executive');
  const [agreedRate, setAgreedRate] = useState('');

  if (isLoadingAudits) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  const handleAssignVendor = () => {
    if (!selectedAuditId || !selectedVendor || !selectedAudit) return;
    assignMember.mutate({
      audit_id: selectedAuditId,
      audit_date: selectedAudit.audit_date,
      project_id: selectedAudit.project_id,
      vendor_id: selectedVendor,
      user_id: null,
      role: selectedRole,
      agreed_rate: agreedRate ? Number(agreedRate) : null
    }, { onSuccess: () => setVendorModalOpen(false) });
  };

  const handleAssignEmployee = () => {
    if (!selectedAuditId || !selectedEmployee || !selectedAudit) return;
    assignMember.mutate({
      audit_id: selectedAuditId,
      audit_date: selectedAudit.audit_date,
      project_id: selectedAudit.project_id,
      vendor_id: null,
      user_id: selectedEmployee,
      role: selectedRole,
      agreed_rate: agreedRate ? Number(agreedRate) : null
    }, { onSuccess: () => setEmployeeModalOpen(false) });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Col: Audit List */}
      <Card className="md:col-span-1 h-[calc(100vh-250px)] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Scheduled Audits</CardTitle>
          <CardDescription>Select an audit to build its team.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
          {!audits || audits.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No scheduled audits found.</div>
          ) : (
            audits.map((audit: any) => (
              <div 
                key={audit.id}
                onClick={() => setSelectedAuditId(audit.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedAuditId === audit.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}
              >
                <div className="font-medium text-sm">{audit.store_name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{audit.client?.name}</span>
                  <span className="text-xs font-medium">{format(new Date(audit.audit_date), 'MMM d, yy')}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Right Col: Team Builder */}
      <Card className="md:col-span-2 h-[calc(100vh-250px)] flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {selectedAudit ? `Team: ${selectedAudit.store_name}` : 'Team Builder'}
            </CardTitle>
            <CardDescription>
              {selectedAudit ? `Assign internal and external resources for ${format(new Date(selectedAudit.audit_date), 'MMMM d, yyyy')}` : 'Select an audit to begin.'}
            </CardDescription>
          </div>
          {selectedAudit && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Revenue:</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                  <input 
                    type="number"
                    className="h-8 w-24 rounded-md border border-input bg-background pl-6 pr-2 py-1 text-xs"
                    defaultValue={selectedAudit.billing_amount || 0}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val !== selectedAudit.billing_amount) {
                        updateAudit.mutate({ id: selectedAudit.id, billing_amount: val });
                      }
                    }}
                    disabled={updateAudit.isPending}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Status:</span>
                <select 
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={selectedAudit.status}
                  onChange={(e) => {
                    const val = e.target.value;
                    if ((val === 'in_progress' || val === 'completed') && !requirementsMet) {
                      toast.error('Cannot change status: Team size requirements not met.');
                      return;
                    }
                    updateAudit.mutate({ id: selectedAudit.id, status: val });
                  }}
                  disabled={updateAudit.isPending}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this audit? This will remove all team assignments and delete the associated project.')) {
                    deleteAudit.mutate(selectedAudit, { onSuccess: () => setSelectedAuditId(null) });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {!selectedAudit ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
              No audit selected
            </div>
          ) : isLoadingTeam ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
          ) : (
            <div className="space-y-6">
              
              {(reqLeads > 0 || reqExecs > 0) && (
                <div className={`p-4 rounded-lg border ${requirementsMet ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <h4 className={`text-sm font-semibold mb-2 ${requirementsMet ? 'text-green-800' : 'text-amber-800'}`}>
                    {requirementsMet ? 'Team Size Satisfied' : 'Missing Team Requirements'}
                  </h4>
                  <div className="flex gap-6 text-sm">
                    {reqLeads > 0 && (
                      <div className={assignedLeads < reqLeads ? 'text-amber-700 font-medium' : 'text-green-700'}>
                        Leads: {assignedLeads} / {reqLeads}
                      </div>
                    )}
                    {reqExecs > 0 && (
                      <div className={assignedExecs < reqExecs ? 'text-amber-700 font-medium' : 'text-green-700'}>
                        Executives: {assignedExecs} / {reqExecs}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setVendorModalOpen(true)}><Building className="w-4 h-4 mr-2" /> Add Vendor</Button>
                <Button size="sm" onClick={() => setEmployeeModalOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Add Employee</Button>
              </div>

              <div className="border rounded-md divide-y">
                {!team || team.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No resources assigned yet.
                  </div>
                ) : (
                  team.map((member: any) => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          {member.user_id ? <User className="h-5 w-5 text-slate-600" /> : <Building className="h-5 w-5 text-slate-600" />}
                        </div>
                        <div>
                          <div className="font-medium">{member.user_id ? member.user?.full_name : member.vendor?.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                            {member.vendor_id && <Badge variant="secondary" className="text-xs">External Vendor</Badge>}
                            {member.user_id && <Badge variant="secondary" className="text-xs">Internal Employee</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { if(confirm('Remove member?')) removeMember.mutate({ id: member.id, auditId: selectedAudit.id }) }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Assignment Modal */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vendor Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Vendor</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                <option value="">-- Choose Vendor --</option>
                {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)}>
                <option value="lead">Lead</option>
                <option value="executive">Executive</option>
                <option value="asset">Asset / Equipment</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Override Rate (₹) [Optional]</label>
              <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={agreedRate} onChange={e => setAgreedRate(e.target.value)} placeholder="Leave blank to use default rate" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignVendor} disabled={!selectedVendor || assignMember.isPending}>
              {assignMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Assignment Modal */}
      <Dialog open={employeeModalOpen} onOpenChange={setEmployeeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Internal Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                <option value="">-- Choose Employee --</option>
                {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)}>
                <option value="lead">Lead</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Man Day Cost (₹) [Optional]</label>
              <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={agreedRate} onChange={e => setAgreedRate(e.target.value)} placeholder="Cost per day" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignEmployee} disabled={!selectedEmployee || assignMember.isPending}>
              {assignMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
