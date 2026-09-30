import React, { useState } from 'react';
import { useAudits, useAuditTeams, useAssignTeamMember, useRemoveTeamMember, useUpdateAudit, useDeleteAudit, useCompleteAudit, useCancelAudit } from '@/hooks/useAudits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, Trash2, Building, User, CheckCircle, Ban, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function TeamBuilder() {
  const queryClient = useQueryClient();
  const { data: audits, isLoading: isLoadingAudits } = useAudits();
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(sessionStorage.getItem('teamBuilderAuditId') || null);

  const { data: team, isLoading: isLoadingTeam } = useAuditTeams(selectedAuditId || undefined);
  const assignMember = useAssignTeamMember();
  const removeMember = useRemoveTeamMember();
  const updateAudit = useUpdateAudit();
  const completeAudit = useCompleteAudit();
  const cancelAudit = useCancelAudit();
  const deleteAudit = useDeleteAudit();

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);

  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: async () => {
    const { data: v } = await supabase.from('vendors').select('*').order('name'); 
    const { data: internalProfiles } = await supabase.from('profiles').select('*').eq('is_internal_vendor', true);
    const internalVendors = internalProfiles?.map(p => ({
      id: p.id,
      name: p.full_name + ' (Internal Employee Vendor)',
      type: 'individual',
      is_internal_user: true
    })) || [];
    return [...(v || []), ...internalVendors];
  }});

  const { data: employees } = useQuery({ queryKey: ['profiles'], queryFn: async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'active').order('full_name'); return data;
  }});

  const selectedAudit = audits?.find(a => a.id === selectedAuditId);
  useEffect(() => {
    if (selectedAudit) {
      setContactPersonId(selectedAudit.contact_person_id || '');
      setBillingAmount(selectedAudit.billing_amount ? selectedAudit.billing_amount.toString() : '');
    }
  }, [selectedAuditId, selectedAudit?.contact_person_id, selectedAudit?.billing_amount]);

  const assignedLeads = team?.filter(m => m.role === 'lead').length || 0;
  const assignedExecs = team?.filter(m => m.role === 'executive').length || 0;
  const reqLeads = selectedAudit?.required_leads || 0;
  const reqExecs = selectedAudit?.required_executives || 0;
  const isTeamSatisfied = (assignedLeads >= reqLeads) && (assignedExecs >= reqExecs);
  const requirementsMet = reqLeads > 0 || reqExecs > 0 ? isTeamSatisfied : true;

  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState<'lead' | 'executive' | 'asset'>('executive');
  const [actingAs, setActingAs] = useState<'solo' | 'agency'>('solo');
  const [agreedRate, setAgreedRate] = useState('');
  
  // New state for Contact Person
  
  const { data: overlappingAssignments } = useQuery({
    queryKey: ['audit_conflicts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_teams')
        .select(`
          user_id, vendor_resource_id, vendor_id,
          audit:audits!inner(id, store_name, audit_date, end_date, status)
        `)
        .neq('audit.status', 'completed');
      return data || [];
    }
  });

  const checkConflict = (userId: string | null, vendorId: string | null, vendorResourceId: string | null) => {
    if (!selectedAudit || !overlappingAssignments) return null;
    const s1 = new Date(selectedAudit.audit_date);
    const e1 = new Date(selectedAudit.end_date || selectedAudit.audit_date);
    
    for (const a of overlappingAssignments) {
      const au = a.audit as any;
      if (au.id === selectedAudit.id) continue;
      
      let match = false;
      if (userId && a.user_id === userId) match = true;
      else if (vendorResourceId && a.vendor_resource_id === vendorResourceId) match = true;
      else if (vendorId && !vendorResourceId && a.vendor_id === vendorId && a.vendor_resource_id === null) match = true;
      
      if (!match) continue;
      
      const s2 = new Date(au.audit_date);
      const e2 = new Date(au.end_date || au.audit_date);
      
      if (s1 <= e2 && e1 >= s2) {
        return au;
      }
    }
    return null;
  };

  const [contactPersonId, setContactPersonId] = useState<string>('');
  const [billingAmount, setBillingAmount] = useState<string>('');

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
  const isIndividual = selectedVendorObj?.type === 'individual' && actingAs === 'solo';
  



  const [isNotifying, setIsNotifying] = useState(false);
  if (isLoadingAudits) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  const handleCompleteAudit = async () => {
    if (!selectedAuditId) return;
    if (confirm('Are you sure you want to mark this audit as completed? It will be removed from active projects.')) {
      completeAudit.mutate(selectedAuditId);
    }
  };

  const handleCancelAudit = async () => {
    if (!selectedAuditId) return;
    if (confirm('Are you sure you want to cancel this audit? This will mark the audit as cancelled, remove all team allocations, and free up employee schedules.')) {
      cancelAudit.mutate(selectedAuditId);
    }
  };

  const handlePublishAudit = async () => {
    if (!selectedAuditId) return;
    if (!requirementsMet) {
      toast.error('Cannot publish audit: Required leads and executives must be assigned first.');
      return;
    }
    setIsNotifying(true);
    try {
      const { error } = await supabase.rpc('publish_audit', { p_audit_id: selectedAuditId });
      if (error) throw error;
      toast.success('Audit scheduled, team allocated, and vendors notified!');
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    } catch (err: any) {
      toast.error('Failed to publish audit: ' + err.message);
    } finally {
      setIsNotifying(false);
    }
  };

  const handleUpdateContactPerson = async () => {
    if (!selectedAuditId) return;
    updateAudit.mutate({ 
      id: selectedAuditId, 
      contact_person_id: contactPersonId || null,
      billing_amount: billingAmount ? Number(billingAmount) : 0
    }, {
      onSuccess: () => toast.success('Audit details updated')
    });
  };

  const handleAssignVendor = async () => {
    if (!selectedAuditId || !selectedVendor || !selectedAudit) return;
    if (!isIndividual && selectedResources.length === 0) return;
    
    try {
      if (isIndividual) {
        let rateToUse = agreedRate ? Number(agreedRate) : null;
        if (!rateToUse) {
          if (selectedRateId) {
            const selectedRateObj = vendorRates?.find(r => r.id === selectedRateId);
            if (selectedRateObj) rateToUse = selectedRateObj.human_rate;
          } else {
            rateToUse = selectedVendorObj?.default_human_rate;
          }
        }
        await assignMember.mutateAsync({
          audit_id: selectedAuditId,
          project_id: selectedAudit.project_id,
          audit_date: selectedAudit.audit_date,
          user_id: selectedVendorObj?.is_internal_user ? selectedVendor : null,
          vendor_id: selectedVendorObj?.is_internal_user ? null : selectedVendor,
          vendor_resource_id: null,
          role: selectedRole,
          agreed_rate: rateToUse
        });
      } else {
        // Multi-select for agency resources
        for (const resId of selectedResources) {
          let rateToUse = agreedRate ? Number(agreedRate) : null;
          const resObj = vendorResources?.find((r: any) => r.id === resId);
          if (!rateToUse) {
            if (selectedRateId) {
               const selectedRateObj = vendorRates?.find((r: any) => r.id === selectedRateId);
               if (selectedRateObj && resObj) {
                 rateToUse = resObj.type === 'man' ? selectedRateObj.human_rate : selectedRateObj.asset_rate;
               }
            } else {
               if (resObj && resObj.default_rate) {
                 rateToUse = resObj.default_rate;
               }
            }
          }
          await assignMember.mutateAsync({
            audit_id: selectedAuditId,
            project_id: selectedAudit.project_id,
            audit_date: selectedAudit.audit_date,
            user_id: null,
            vendor_id: selectedVendor,
            vendor_resource_id: resId,
            role: resObj?.type === 'asset' ? 'asset' : selectedRole,
            agreed_rate: rateToUse
          });
        }
      }
      setVendorModalOpen(false);
      setSelectedVendor('');
      setSelectedResources([]);
      setSelectedRateId('');
      setAgreedRate('');
      setSelectedRole('executive');
      toast.success('Vendor(s) assigned');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign vendor');
    }
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
              setBillingAmount(audit.billing_amount ? audit.billing_amount.toString() : '');
            }}
          >
            <div className="font-medium text-sm">{audit.store_name || audit.project?.name || 'Unknown Project'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(audit.audit_date), 'MMM d')} {audit.end_date && audit.end_date !== audit.audit_date ? `- ${format(new Date(audit.end_date), 'MMM d, yyyy')}` : `, ${format(new Date(audit.audit_date), 'yyyy')}`}
            </div>
            <div className="flex justify-between items-center mt-3">
               <Badge 
                 variant={
                   audit.status === 'scheduled' 
                     ? 'default' 
                     : audit.status === 'completed' 
                     ? 'secondary' 
                     : audit.status === 'cancelled' 
                     ? 'destructive' 
                     : 'outline'
                 } 
                 className={`text-[10px] capitalize ${audit.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' : ''}`}
               >
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
        {!selectedAudit ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Select an audit from the list to build the team.
          </div>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selectedAudit?.project?.name}</CardTitle>
                <CardDescription>
                  Date(s): {format(new Date(selectedAudit?.audit_date || new Date()), 'MMM d, yyyy')} {selectedAudit?.end_date && selectedAudit.end_date !== selectedAudit.audit_date ? `- ${format(new Date(selectedAudit.end_date), 'MMM d, yyyy')}` : ''}
                </CardDescription>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={selectedAudit?.status === 'completed' || deleteAudit.isPending}
                title={selectedAudit?.status === 'completed' ? 'Completed audits cannot be deleted' : 'Delete this audit'}
                onClick={() => {
                  if (selectedAudit?.status === 'completed') {
                    toast.error('Completed audits cannot be deleted.');
                    return;
                  }
                  if (confirm('Delete this audit entirely? This will remove the audit, team assignments, allocations, and corresponding project across the entire application.')) {
                    deleteAudit.mutate(selectedAudit, {
                      onSuccess: () => {
                        setSelectedAuditId(null);
                        sessionStorage.removeItem('teamBuilderAuditId');
                      }
                    });
                  }
                }}
              >
                {deleteAudit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              
              <div className="space-y-6">
              
                {/* Contact Person Setup */}
                <div className="p-4 rounded-lg border bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold">Audit Management</h4>
                    <Badge 
                      variant={
                        selectedAudit.status === 'scheduled' 
                          ? 'default' 
                          : selectedAudit.status === 'completed' 
                          ? 'secondary' 
                          : selectedAudit.status === 'cancelled' 
                          ? 'destructive' 
                          : 'outline'
                      }
                      className="capitalize"
                    >
                      {selectedAudit.status}
                    </Badge>
                  </div>

                  {selectedAudit.scheduled_at && (
                    <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">Scheduled By:</span>
                        <span className="text-blue-700 font-medium">{selectedAudit.scheduler?.full_name || 'System / Manager'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">Scheduled At:</span>
                        <span>{format(new Date(selectedAudit.scheduled_at), 'dd-MMM-yyyy hh:mm a')}</span>
                      </div>
                    </div>
                  )}

                  {selectedAudit.status === 'cancelled' && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 shrink-0 text-red-600" />
                        <span><strong>This audit is Cancelled.</strong> All team allocations have been removed.</span>
                      </div>
                      {selectedAudit.cancelled_at && (
                        <div className="text-[11px] text-red-700 bg-red-100/60 p-1.5 rounded flex flex-wrap items-center justify-between gap-2 border border-red-200/60">
                          <div>
                            <span className="font-semibold">Cancelled by: </span>
                            <span>{selectedAudit.canceller?.full_name || 'System / Manager'}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Cancelled on: </span>
                            <span>{format(new Date(selectedAudit.cancelled_at), 'dd-MMM-yyyy hh:mm a')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    <label className="text-sm text-muted-foreground w-1/4">Contact Person</label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                      value={contactPersonId} onChange={e => setContactPersonId(e.target.value)}>
                      <option value="">-- Select Contact Person --</option>
                      {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                    </select>
                    </div>
                    {contactPersonId && (() => {
                      const cp = employees?.find((emp: any) => emp.id === contactPersonId);
                      const email = cp?.personal_email || (cp?.email && !cp.email.includes('@kgac-users.com') ? cp.email : null);
                      const phone = cp?.phone_number;
                      return (
                        <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 ml-[25%] flex flex-wrap gap-x-5 gap-y-1">
                          <span>📧 Email: <strong className="text-slate-800">{email || 'Not available'}</strong></span>
                          <span>📞 Phone: <strong className="text-slate-800">{phone || 'Not available'}</strong></span>
                        </div>
                      );
                    })()}
                    <div className="flex gap-2 items-center">
                      <label className="text-sm text-muted-foreground w-1/4">Client Revenue (₹)</label>
                      <div className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm items-center">
                        <span className="text-muted-foreground mr-2">₹</span>
                        <input type="number" className="bg-transparent border-0 outline-none w-full" 
                          value={billingAmount} onChange={e => setBillingAmount(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleUpdateContactPerson} disabled={updateAudit.isPending}>Save Details</Button>
                    </div>
                    <div className="pt-2 mt-2 border-t flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        {selectedAudit.status === 'scheduled' && (
                          <Button variant="secondary" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200" size="sm" onClick={handleCompleteAudit} disabled={completeAudit.isPending}>
                            {completeAudit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Mark Completed
                          </Button>
                        )}
                        {selectedAudit.status !== 'cancelled' && selectedAudit.status !== 'completed' && (
                          <Button 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" 
                            size="sm" 
                            onClick={handleCancelAudit} 
                            disabled={cancelAudit.isPending}
                          >
                            {cancelAudit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                            Cancel Audit
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePublishAudit} 
                          disabled={
                            isNotifying || 
                            !team || 
                            team.length === 0 || 
                            selectedAudit.status === 'completed' || 
                            selectedAudit.status === 'cancelled' ||
                            !requirementsMet
                          }
                          title={!requirementsMet ? 'Lead and Executive requirements must be met before publishing' : ''}
                        >
                          {isNotifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {selectedAudit.status === 'completed' 
                            ? 'Audit Completed' 
                            : selectedAudit.status === 'cancelled'
                            ? 'Audit Cancelled'
                            : 'Publish & Notify Team'}
                        </Button>
                        {!requirementsMet && selectedAudit.status !== 'completed' && selectedAudit.status !== 'cancelled' && (
                          <span className="text-[11px] text-amber-600 font-medium">
                            Requirements for Leads &amp; Executives must be met
                          </span>
                        )}
                      </div>
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
                  value={selectedVendor} onChange={e => { setSelectedVendor(e.target.value); setSelectedResources([]); setSelectedRateId(''); setActingAs('solo'); }}>
                  <option value="">-- Choose Vendor --</option>
                  {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              {selectedVendor && selectedVendorObj?.type === 'individual' && checkConflict(selectedVendorObj.is_internal_user ? selectedVendor : null, selectedVendorObj.is_internal_user ? null : selectedVendor, null) && (
                <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200 mt-2">
                  ⚠️ Warning: This individual is already double-booked on those dates for another audit: {checkConflict(selectedVendorObj.is_internal_user ? selectedVendor : null, selectedVendorObj.is_internal_user ? null : selectedVendor, null)?.store_name}.
                </p>
              )}
              {selectedVendor && selectedVendorObj?.type === 'individual' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Acting as</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input type="radio" value="solo" checked={actingAs === 'solo'} onChange={() => { setActingAs('solo'); setSelectedResources([]); }} className="accent-indigo-600" />
                      <span className="text-sm">Solo Resource</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" value="agency" checked={actingAs === 'agency'} onChange={() => setActingAs('agency')} className="accent-indigo-600" />
                      <span className="text-sm">Agency (Providing someone else)</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedVendor && !isIndividual && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">2. Select Resources (Man/Asset)</label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3 bg-slate-50">
                    {vendorResources?.map((r: any) => {
                      const conflict = checkConflict(null, null, r.id);
                      return (
                      <div key={r.id} className="flex flex-col">
                        <label className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            className="accent-indigo-600 rounded w-4 h-4"
                            checked={selectedResources.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedResources([...selectedResources, r.id]);
                              else setSelectedResources(selectedResources.filter(id => id !== r.id));
                              setSelectedRateId('');
                            }}
                          />
                          <span className="text-sm">{r.name} ({r.type}) - Default Rate: {r.default_rate || 'None'}</span>
                        </label>
                        {conflict && <span className="text-xs text-red-600 ml-6 font-medium">⚠️ Double-booked! Also scheduled for: {conflict.store_name}</span>}
                      </div>
                    )})}
                  </div>
                </div>
              )}
              
              {(selectedResources.length > 0 || isIndividual) && vendorRates && vendorRates.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">3. Rate Override (Optional)</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    value={selectedRateId} onChange={e => setSelectedRateId(e.target.value)}>
                    <option value="">-- Use Resource Default --</option>
                    {vendorRates.map((r: any) => <option key={r.id} value={r.id}>{r.zone_or_reason} (Human: {r.human_rate || '-'}, Asset: {r.asset_rate || '-'})</option>)}
                  </select>
                </div>
              )}

              {(selectedResources.length > 0 || isIndividual) && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                      value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)}>
                      {selectedResources.some(id => vendorResources?.find((r:any) => r.id === id)?.type === 'asset') ? (
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
                  !selectedVendor || (!isIndividual && selectedResources.length === 0) || assignMember.isPending || 
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
                {selectedEmployee && checkConflict(selectedEmployee, null, null) && (
                  <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200 mt-2">
                    ⚠️ Warning: This employee is already double-booked on those dates for another audit: {checkConflict(selectedEmployee, null, null)?.store_name}.
                  </p>
                )}
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
























