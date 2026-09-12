import { AuditImportTool } from '@/components/planner/AuditImportTool';
import { TeamBuilder } from '@/components/planner/TeamBuilder';
import { VendorManager } from '@/components/planner/VendorManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PlannerPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6 overflow-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Audit Planner</h2>
        <p className="text-sm text-slate-500">Import client requirements and build audit teams.</p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="teams">Team Builder</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AuditImportTool />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Imports</CardTitle>
                <CardDescription>Recently uploaded client data.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex h-32 items-center justify-center border-2 border-dashed rounded-md">
                  No recent imports found.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="mt-0">
          <TeamBuilder />
        </TabsContent>

        <TabsContent value="vendors" className="mt-0">
          <VendorManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
