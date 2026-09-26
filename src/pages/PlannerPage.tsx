import { AuditImportTool } from '@/components/planner/AuditImportTool';
import { TeamBuilder } from '@/components/planner/TeamBuilder';
import { VendorManager } from '@/components/admin/VendorManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export function PlannerPage() {
  const [activeTab, setActiveTab] = React.useState('import');
  const { data: recentAudits, isLoading } = useQuery({
    queryKey: ['recent-audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          id,
          store_name,
          audit_date,
          created_at,
          clients ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6 overflow-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Audit Planner</h2>
        <p className="text-sm text-slate-500">Import client requirements and build audit teams.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="teams">Team Builder</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" forceMount className={"mt-0 space-y-6 "}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AuditImportTool />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Imports</CardTitle>
                <CardDescription>Recently uploaded client data.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !recentAudits || recentAudits.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex h-32 items-center justify-center border-2 border-dashed rounded-md">
                    No recent imports found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentAudits.map((audit: any) => (
                      <div key={audit.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{audit.store_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {audit.clients?.name} | {format(new Date(audit.audit_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                          {format(new Date(audit.created_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" forceMount className={"mt-0 "}>
          <TeamBuilder />
        </TabsContent>

        <TabsContent value="vendors" forceMount className={"mt-0 "}>
          <VendorManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}



