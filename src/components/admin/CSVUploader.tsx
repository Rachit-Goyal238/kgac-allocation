import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, Download, Check, X, Loader2 } from 'lucide-react';
import { SAMPLE_CSV_CONTENT } from '@/lib/constants';
import { CSVValidationResult, UserRole } from '@/lib/types';
import { useBulkInsertProfiles } from '@/hooks/useProfiles';

export function CSVUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<CSVValidationResult[]>([]);
  const { mutateAsync: bulkInsert, isPending } = useBulkInsertProfiles();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const validated = result.data.map((row: any, index: number) => {
          const rowData = row as any;
          const email = rowData.Email || rowData.email;
          const name = rowData.Name || rowData.full_name;
          const role = (rowData.Role || rowData.role || '').toLowerCase();
          const errors = [];
          
          if (!email) errors.push('Email is required');
          else if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('Invalid email format');
          if (!name) errors.push('Name is required');
          
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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const validRows = results.filter(r => r.isValid);

  const handleImport = async () => {
    try {
      const profiles = validRows.map(r => {
        const rowData = r.data as any;
        return {
          email: rowData.Email || rowData.email,
          full_name: rowData.Name || rowData.full_name,
          roles: [(rowData.Role || rowData.role || 'employee').toLowerCase() as UserRole],
          department_id: rowData.Department || rowData.department_id || 'engineering',
          entity: (rowData.Entity || rowData.entity || 'KGAC').toUpperCase() as any,
          zone: rowData.Zone || rowData.zone || null,
          status: 'active' as const
        };
      });
      await bulkInsert(profiles);
      setIsOpen(false);
      setResults([]);
    } catch (err) {
      console.error(err);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><UploadCloud className="mr-2 h-4 w-4" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk User Import</DialogTitle>
        </DialogHeader>
        
        {results.length === 0 ? (
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
                    <div className="font-medium">{(r.data as any).Name || (r.data as any).full_name || 'Missing Name'} ({(r.data as any).Email || (r.data as any).email || 'Missing Email'})</div>
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
