import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Check, Copy, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useBulkInsertProfiles, useDepartments } from '@/hooks/useProfiles';
import { ROLE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

export function SingleEmployeeOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    personal_email: '',
    phone_number: '',
    role: 'audit_executive',
    department_id: '',
    entity: 'KGAC',
    zone: '',
    monthly_salary: ''
  });

  const [generatedCredential, setGeneratedCredential] = useState<{
    employee_id: string;
    name: string;
    username: string;
    password: string;
  } | null>(null);

  const { data: departments } = useDepartments();
  const { mutateAsync: bulkInsert, isPending } = useBulkInsertProfiles();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGeneratedCredential(null);
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        personal_email: '',
        phone_number: '',
        role: 'audit_executive',
        department_id: '',
        entity: 'KGAC',
        zone: '',
        monthly_salary: ''
      });
    }
    setIsOpen(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id.trim()) {
      toast.error('Employee ID is required');
      return;
    }
    if (!formData.first_name.trim()) {
      toast.error('First Name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      toast.error('Last Name is required');
      return;
    }

    try {
      const payload = [{
        employee_id: formData.employee_id.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        personal_email: formData.personal_email.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        role: formData.role.toLowerCase(),
        department_id: formData.department_id || null,
        entity: formData.entity.toUpperCase(),
        zone: formData.zone.trim() || null,
        monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null
      }];

      const res = await bulkInsert(payload);
      if (res && res.length > 0) {
        setGeneratedCredential(res[0]);
        toast.success(`Employee ${formData.first_name} onboarded successfully!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to onboard employee');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const copyAllCredentials = () => {
    if (!generatedCredential) return;
    const text = `KGAC Employee Login Credentials:\nName: ${generatedCredential.name}\nEmployee ID: ${generatedCredential.employee_id}\nUsername: ${generatedCredential.username}\nPassword: ${generatedCredential.password}`;
    navigator.clipboard.writeText(text);
    toast.success('All credentials copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white hover:bg-slate-800">
          <UserPlus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {generatedCredential ? (
              <>
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Employee Account Created
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 text-slate-700" />
                Add Single Employee
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {generatedCredential ? (
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-md text-sm">
              <p className="font-semibold flex items-center mb-1">
                <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> Account Created Successfully
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                The employee profile and login credentials have been provisioned. 
                <strong> Copy these credentials now</strong> as temporary passwords cannot be retrieved again.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-lg p-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-slate-500 font-sans text-xs">Full Name:</span>
                <span className="font-sans font-semibold text-slate-900">{generatedCredential.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-slate-500 font-sans text-xs">Employee ID:</span>
                <span className="font-bold text-slate-800">{generatedCredential.employee_id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-slate-500 font-sans text-xs">Username / Login Email:</span>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">{generatedCredential.username}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                    onClick={() => copyToClipboard(generatedCredential.username, 'Username')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans text-xs">Temporary Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {generatedCredential.password}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                    onClick={() => copyToClipboard(generatedCredential.password, 'Password')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between pt-2">
              <Button variant="outline" onClick={copyAllCredentials} className="text-xs">
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy All Credentials
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="employee_id" className="text-xs font-semibold">Employee ID *</Label>
                <Input
                  id="employee_id"
                  placeholder="e.g. EMP042"
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entity" className="text-xs font-semibold">Entity *</Label>
                <Select value={formData.entity} onValueChange={v => setFormData({ ...formData, entity: v })}>
                  <SelectTrigger id="entity">
                    <SelectValue placeholder="Select Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KGAC">KGAC</SelectItem>
                    <SelectItem value="KPL">KPL</SelectItem>
                    <SelectItem value="XSPL">XSPL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-semibold">First Name *</Label>
                <Input
                  id="first_name"
                  placeholder="e.g. Rahul"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-semibold">Last Name *</Label>
                <Input
                  id="last_name"
                  placeholder="e.g. Sharma"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="personal_email" className="text-xs font-semibold">Personal Email</Label>
                <Input
                  id="personal_email"
                  type="email"
                  placeholder="rahul@gmail.com"
                  value={formData.personal_email}
                  onChange={e => setFormData({ ...formData, personal_email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone_number" className="text-xs font-semibold">Phone Number</Label>
                <Input
                  id="phone_number"
                  placeholder="+91 9876543210"
                  value={formData.phone_number}
                  onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-semibold">Role *</Label>
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-semibold">Department</Label>
                <Select value={formData.department_id} onValueChange={v => setFormData({ ...formData, department_id: v })}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zone" className="text-xs font-semibold">Zone / Region</Label>
                <Input
                  id="zone"
                  placeholder="e.g. North / Delhi"
                  value={formData.zone}
                  onChange={e => setFormData({ ...formData, zone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="monthly_salary" className="text-xs font-semibold">Monthly Salary (INR)</Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  placeholder="e.g. 35000"
                  value={formData.monthly_salary}
                  onChange={e => setFormData({ ...formData, monthly_salary: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create &amp; Generate Credentials
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
