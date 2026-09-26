import React, { useState } from 'react';
import { useAudits, useAuditTeams, useAssignTeamMember, useRemoveTeamMember, useUpdateAudit, useDeleteAudit } from '@/hooks/useAudits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, Trash2, Building, User } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function TeamBuilder() {
  const { data: audits, isLoading: isLoadingAudits } = useAudits();
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(sessionStorage.getItem('teamBuilderAuditId') || null);

  const { data: team, isLoading: isLoadingTeam } = useAuditTeams(selectedAuditId || undefined);
  const assignMember = useAssignTeamMember();
  const removeMember = useRemoveTeamMember();
  const updateAudit = useUpdateAudit();
  const deleteAudit = useDeleteAudit();

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);

  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: async () => {
    const { data: v } = await supabase.from('vendors').select('*').order('name'); 
    return v || [];
  }});

  const { data: employees } = useQuery({ queryKey: ['profiles'], queryFn: async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'active').order('full_name'); return data;
  }});

  const selectedAudit = audits?.find(a => a.id === selectedAuditId);
  const assignedLeads = team?.filter(m => m.role === 'lead').length || 0;
  const assignedExecs = team?.filter(m => m.role === 'executive').length || 0;
  const reqLeads = selectedAudit?.required_leads || 0;
  const reqExecs = selectedAudit?.required_executives || 0;
  const isTeamSatisfied = (assignedLeads >= reqLeads) && (assignedExecs >= reqExecs);
  const requirementsMet = reqLeads > 0 || reqExecs > 0 ? isTeamSatisfied : true;

  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedRateId, setSelectedRateId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState<'lead' | 'executive' | 'asset'>('executive');
  const [agreedRate, setAgreedRate] = useState('');
  
  // New state for Contact Person
  const [contactPersonId, setContactPersonId] = useState<string>('');

  const { data: vendorResources } = useQuery({ queryKey: ['vendor_resources_tb', selectedVendor], queryFn: async () => {
    if (!selectedVendor) return [];
    const { data } = await supabase.from('vendor_resources').select('*').eq('vendor_id', selectedVendor).order('name'); 
    return data || [];
  }, enabled: !!selectedVendor });

  const { data: vendorRates } = useQuery({ queryKey: ['vendor_rates', selectedVendor], queryFn: async () => {
    if (!selectedVendor) return [];
    const { data } = await supabase.from('vendor_rates').select('*').eq('vendor_id', selectedVendor); 
    return data || [];
  }, enabled: !!selectedVendor });

  const selectedVendorObj = vendors?.find((v: any) => v.id === selectedVendor);
  const isIndividual = selectedVendorObj?.type === 'individual';
  const selectedResourceObj = vendorResources?.find((r: any) => r.id === selectedResource);

  if (isLoadingAudits) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  const handleUpdateContactPerson = async () => {
    if (!selectedAuditId) return;
    updateAudit.mutate({ id: selectedAuditId, contact_person_id: contactPersonId || null }, {
      onSuccess: () => toast.success('Contact person updated')
    });
  };

  const handleAssignVendor = () => {
    if (!selectedAuditId || !selectedVendor || (!isIndividual && !selectedResource) || !selectedAudit) return;
    
    let rateToUse = agreedRate ? Number(agreedRate) : null;
    
    if (!rateToUse) {
      if (isIndividual) {
        if (selectedRateId) {
          const selectedRateObj = vendorRates?.find(r => r.id === selectedRateId);
          if (selectedRateObj) rateToUse = selectedRateObj.human_rate;
        } else {
          rateToUse = selectedVendorObj?.default_human_rate;
        }
      } else {
      if (selectedRateId) {
         const selectedRateObj = vendorRates?.find(r => r.id === selectedRateId);
         const resObj = vendorResources?.find(r => r.id === selectedResource);
         if (selectedRateObj && resObj) {
           rateToUse = resObj.type === 'man' ? selectedRateObj.human_rate : selectedRateObj.asset_rate;
         }
      } else {
         const resObj = vendorResources?.find(r => r.id === selectedResource);
         if (resObj && resObj.default_rate) {
           rateToUse = resObj.default_rate;
         }
      }
    }
    }

    assignMember.mutate({
      audit_id: selectedAuditId,
      project_id: selectedAudit.project_id,
      audit_date: selectedAudit.audit_date,
      user_id: null,
      vendor_id: selectedVendor,
      vendor_resource_id: isIndividual ? null : selectedResource,
      role: selectedRole,
      agreed_rate: rateToUse
    }, {
      onSuccess: () => {
        setVendorModalOpen(false);
        setSelectedVendor('');
        setSelectedResource('');
        setSelectedRateId('');
        setAgreedRate('');
        setSelectedRole('executive');
        toast.success('Vendor assigned');
      }
    });
  };

  const handleAssignEmployee = () => {
    if (!selectedAuditId || !selectedEmployee || !selectedAudit) return;
    assignMember.mutate({
      audit_id: selectedAuditId,
      project_id: selectedAudit.project_id,
      audit_date: selectedAudit.audit_date,
      user_id: selectedEmployee,
      vendor_id: null,
      vendor_resource_id: null,
      role: selectedRole,
      agreed_rate: null
    }, {
      onSuccess: () => {
        setEmployeeModalOpen(false);
        setSelectedEmployee('');
        setSelectedRole('executive');
        toast.success('Employee assigned');
      }
    });
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Left List */}
      <div className="w-1/3 border-r pr-4 overflow-y-auto space-y-3">
        <h3 className="font-semibold text-lg mb-4">Audits ({audits?.length || 0})</h3>
        {audits?.map((audit: any) => (
          <div 
            key={audit.id} 
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedAuditId === audit.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}
            onClick={() => {
              setSelectedAuditId(audit.id); sessionStorage.setItem('teamBuilderAuditId', audit.id);
              setContactPersonId(audit.contact_person_id || '');
            }}
          >
            <div className="font-medium text-sm">{audit.project?.name || 'Unknown Project'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(audit.audit_date), 'MMM d, yyyy')}
            </div>
            <div className="flex justify-between items-center mt-3">
               <Badge variant={audit.status === 'scheduled' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                 {audit.status}
               </Badge>
               <div className="text-xs text-slate-500">
                 {audit.required_leads} Leads, {audit.required_executives} Execs
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right Panel */}
      <div className="w-2/3 pl-2 overflow-y-auto">
        {!selectedAuditId ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Select an audit from the list to build the team.
          </div>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selectedAudit?.project?.name}</CardTitle>
                <CardDescription>
                  Audit Date: {format(new Date(selectedAudit?.audit_date || new Date()), 'MMMM d, yyyy')}
                </CardDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={() => {
                if(confirm('Delete this audit entirely?')) deleteAudit.mutate(selectedAuditId);
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              
              <div className="space-y-6">
              
                {/* Contact Person Setup */}
                <div className="p-4 rounded-lg border bg-slate-50 space-y-3">
                  <h4 className="text-sm font-semibold">Audit Management</h4>
                  <div className="flex gap-2 items-center">
                    <label className="text-sm text-muted-foreground w-1/4">Contact Person</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                      value={contactPersonId} onChange={e => setContactPersonId(e.target.value)}>
                      <option value="">-- Select Contact Person --</option>
                      {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                    </select>
                    <Button size="sm" onClick={handleUpdateContactPerson} disabled={updateAudit.isPending}>Save</Button>
                  </div>
                </div>

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
                  {isLoadingTeam ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                  ) : !team || team.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No resources assigned yet.
                    </div>
                  ) : (
                    team.map((member: any) => (
                      <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                            {member.user_id ? <User className="h-5 w-5 text-slate-600" /> : <Building className="h-5 w-5 text-slate-600" />}
                          </div>
                          <div>
                            <div className="font-medium">
                              {member.user_id ? member.user?.full_name : (member.vendor_resource?.name || member.vendor?.name)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.vendor_id ? `via ${member.vendor?.name}` : member.user?.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] uppercase">{member.role}</Badge>
                              {member.vendor_id && <Badge variant="secondary" className="text-[10px]">External Rate: {member.agreed_rate || 'Default'}</Badge>}
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
            </CardContent>
          </Card>
        )}

        {/* Vendor Assignment Modal */}
        <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Vendor Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">1. Select Master Vendor</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={selectedVendor} onChange={e => { setSelectedVendor(e.target.value); setSelectedResource(''); setSelectedRateId(''); }}>
                  <option value="">-- Choose Vendor --</option>
                  {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              {selectedVendor && !isIndividual && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">2. Select Resource (Man/Asset)</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    value={selectedResource} onChange={e => { const newResId = e.target.value; setSelectedResource(newResId); setSelectedRateId(''); const resType = vendorResources?.find((r: any) => r.id === newResId)?.type; if (resType === 'asset') setSelectedRole('asset'); else if (selectedRole === 'asset') setSelectedRole('executive'); }}>
                    <option value="">-- Choose Resource --</option>
                    {vendorResources?.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.type}) - Default Rate: {r.default_rate || 'None'}</option>)}
                  </select>
                </div>
              )}
              
              {(selectedResource || isIndividual) && vendorRates && vendorRates.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">3. Rate Override (Optional)</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    value={selectedRateId} onChange={e => setSelectedRateId(e.target.value)}>
                    <option value="">-- Use Resource Default --</option>
                    {vendorRates.map((r: any) => <option key={r.id} value={r.id}>{r.zone_or_reason} (Human: {r.human_rate || '-'}, Asset: {r.asset_rate || '-'})</option>)}
                  </select>
                </div>
              )}

              {(selectedResource || isIndividual) && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                      value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)}>
                      {selectedResourceObj?.type === 'asset' ? (
                        <option value="asset">Asset / Equipment</option>
                      ) : (
                        <>
                          <option value="lead">Lead</option>
                          <option value="executive">Executive</option>
                        </>
                      )}
                    </select>
                  </div>
    
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Manual Custom Rate (Overrides Everything)</label>
                    <Input type="number" value={agreedRate} onChange={(e: any) => setAgreedRate(e.target.value)} placeholder="0.00" />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVendorModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAssignVendor} 
                disabled={
                  !selectedVendor || (!isIndividual && !selectedResource) || assignMember.isPending || 
                  (selectedRole === 'lead' && assignedLeads >= reqLeads) ||
                  (selectedRole === 'executive' && assignedExecs >= reqExecs)
                }
              >
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
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                  <option value="">-- Choose Employee --</option>
                  {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)}>
                  <option value="lead">Lead</option>
                  <option value="executive">Executive</option>
                </select>
                {selectedRole === 'lead' && assignedLeads >= reqLeads && (
                  <p className="text-xs text-red-500 mt-1">Lead requirement met. Cannot assign more Leads.</p>
                )}
                {selectedRole === 'executive' && assignedExecs >= reqExecs && (
                  <p className="text-xs text-red-500 mt-1">Executive requirement met. Cannot assign more Executives.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmployeeModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAssignEmployee} 
                disabled={
                  !selectedEmployee || 
                  assignMember.isPending || 
                  (selectedRole === 'lead' && assignedLeads >= reqLeads) ||
                  (selectedRole === 'executive' && assignedExecs >= reqExecs)
                }
              >
                {assignMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}












