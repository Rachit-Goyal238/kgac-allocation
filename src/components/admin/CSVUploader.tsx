import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, Download, Check, X, Loader2, Copy } from 'lucide-react';
import { SAMPLE_CSV_CONTENT } from '@/lib/constants';
import { CSVValidationResult } from '@/lib/types';
import { useBulkInsertProfiles, useDepartments } from '@/hooks/useProfiles';
import { toast } from 'sonner';

export function CSVUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<CSVValidationResult[]>([]);
  const [generatedCredentials, setGeneratedCredentials] = useState<any[] | null>(null);
  const { mutateAsync: bulkInsert, isPending } = useBulkInsertProfiles();
  const { data: departments } = useDepartments();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!departments) {
      toast.error('Please wait a moment for departments to load before uploading.');
      return;
    }
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const validated = result.data.map((row: any, index: number) => {
          const rowData = row as any;
          const employee_id = rowData['Employee ID'] || rowData.employee_id;
          const firstName = rowData['First Name'] || rowData.first_name;
          const lastName = rowData['Last Name'] || rowData.last_name;
          const personalEmail = rowData['Personal Email'] || rowData.personal_email;
          const deptName = rowData.Department || rowData.department_id;
          const errors = [];
          
          if (!employee_id) errors.push('Employee ID is required');
          if (!firstName) errors.push('First Name is required');
          if (!lastName) errors.push('Last Name is required');
          
          if (deptName && departments) {
            const matchedDept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
            if (!matchedDept) {
              // It might be a raw UUID, check that too
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deptName);
              if (!isUuid) errors.push(`Department '${deptName}' not found`);
            }
          }
          
          return {
            row: index + 1,
            data: row,
            isValid: errors.length === 0,
            errors
          };
        });
        setResults(validated);
      }
    });
  }, [departments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const validRows = results.filter(r => r.isValid);

  const handleImport = async () => {
    try {
      const profiles = validRows.map(r => {
        const rowData = r.data as any;
        const deptName = rowData.Department || rowData.department_id || null;
        let deptId = deptName;
        
        if (deptName && departments) {
          const matchedDept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
          if (matchedDept) deptId = matchedDept.id;
        }

        return {
          employee_id: rowData['Employee ID'] || rowData.employee_id,
          first_name: rowData['First Name'] || rowData.first_name,
          last_name: rowData['Last Name'] || rowData.last_name,
          personal_email: rowData['Personal Email'] || rowData.personal_email || null,
          role: (rowData.Role || rowData.role || 'employee').toLowerCase(),
          department_id: deptId,
          entity: (rowData.Entity || rowData.entity || 'KGAC').toUpperCase()
        };
      });
      
      const responseData = await bulkInsert(profiles);
      setGeneratedCredentials(responseData);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Import failed');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_allocation_template.csv';
    a.click();
  };

  const downloadCredentials = () => {
    if (!generatedCredentials) return;
    const csvContent = Papa.unparse(generatedCredentials);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_employee_credentials.csv';
    a.click();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setResults([]);
      setGeneratedCredentials(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline"><UploadCloud className="mr-2 h-4 w-4" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{generatedCredentials ? 'Import Successful' : 'Bulk User Import'}</DialogTitle>
        </DialogHeader>
        
        {generatedCredentials ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md">
              <p className="font-medium flex items-center mb-2"><Check className="mr-2 h-5 w-5" /> Accounts created successfully</p>
              <p className="text-sm">The system has automatically generated usernames and temporary passwords for these employees. <strong>Please download or copy these credentials now, as you will not be able to view these passwords again.</strong></p>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0 border-b">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Username</th>
                    <th className="px-4 py-2 font-medium">Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {generatedCredentials.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{c.username}</td>
                      <td className="px-4 py-2 font-mono text-xs">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <DialogFooter>
              <Button onClick={downloadCredentials}>
                <Download className="mr-2 h-4 w-4" /> Download Credentials CSV
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : results.length === 0 ? (
          <div className="space-y-4">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Drag & drop a CSV file here, or click to select</p>
              <p className="text-xs text-muted-foreground mt-2">Only .csv files are supported</p>
            </div>
            
            <div className="flex justify-center">
              <Button variant="link" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download Sample Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            <div className="flex justify-between items-center bg-muted p-2 rounded text-sm font-medium">
              <span>{validRows.length} of {results.length} rows valid</span>
              <Button size="sm" variant="outline" onClick={() => setResults([])}>Clear</Button>
            </div>
            
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`p-3 rounded-md border text-sm flex gap-3 ${r.isValid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="mt-0.5">
                    {r.isValid ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-600" />}
                  </div>
                  <div>
                    <div className="font-medium">
                      {(r.data as any)['First Name']} {(r.data as any)['Last Name']} 
                      <span className="text-muted-foreground font-normal ml-1">({(r.data as any)['Employee ID'] || 'Missing ID'})</span>
                    </div>
                    {!r.isValid && (
                      <div className="text-red-600 text-xs mt-1">
                        {r.errors.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleImport} disabled={validRows.length === 0 || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {validRows.length} Valid Users
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


