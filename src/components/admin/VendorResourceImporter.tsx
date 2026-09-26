import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadCloud, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function VendorResourceImporter() {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<{data: any, isValid: boolean, errors: string[]}[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const generateTemplate = () => {
    const csvContent = "Provider Name,Resource Name,Type (man/asset),Default Rate\nDeloitte,John Smith,man,500\nDeloitte,Dell Laptop,asset,100\nFreelance Auditor A,Freelance Auditor A,man,450";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'vendor_resources_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const { data: vendors } = await supabase.from('vendors').select('id, name');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validated = results.data.map((r: any) => {
          const providerName = String(r['Provider Name'] || '').trim();
          const resourceName = String(r['Resource Name'] || '').trim();
          const type = String(r['Type (man/asset)'] || r['Type'] || '').toLowerCase().trim();
          const rateRaw = r['Default Rate'] || r['Rate'];
          const rate = rateRaw ? Number(rateRaw) : null;

          const errors = [];
          if (!providerName) errors.push('Provider Name required');
          if (!resourceName) errors.push('Resource Name required');
          if (type !== 'man' && type !== 'asset') errors.push('Type must be man or asset');
          
          let vendorId = null;
          if (providerName && vendors) {
            const matched = vendors.find(v => v.name.toLowerCase() === providerName.toLowerCase());
            if (matched) {
              vendorId = matched.id;
            } else {
              vendorId = 'CREATE:' + providerName;
            }
          }

          return {
            data: { provider_name: providerName, resource_name: resourceName, type, default_rate: rate, vendor_id: vendorId },
            isValid: errors.length === 0,
            errors
          };
        });
        setParsedRows(validated);
      }
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  });

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const vendorsToCreate = [...new Set(validRows.filter(r => r.data.vendor_id?.startsWith('CREATE:')).map(r => r.data.provider_name))];
      const newVendorsMap: Record<string, string> = {};
      
      if (vendorsToCreate.length > 0) {
        const { data: insertedVendors, error: insertError } = await supabase.from('vendors').insert(
          vendorsToCreate.map(name => ({ name, type: 'agency' }))
        ).select('id, name');
        
        if (insertError) throw insertError;
        insertedVendors.forEach(v => {
          newVendorsMap[v.name.toLowerCase()] = v.id;
        });
      }

      validRows.forEach(r => {
        if (r.data.vendor_id?.startsWith('CREATE:')) {
          r.data.vendor_id = newVendorsMap[r.data.provider_name.toLowerCase()];
        }
      });

      const batchSize = 50;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize).map(r => ({
          vendor_id: r.data.vendor_id,
          name: r.data.resource_name,
          type: r.data.type,
          default_rate: r.data.default_rate
        }));

        const { error } = await supabase.from('vendor_resources').insert(batch);
        if (error) throw error;
        setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
      }

      toast.success(`Successfully imported ${validRows.length} resources`);
      queryClient.invalidateQueries({ queryKey: ['vendor_resources'] });
      queryClient.invalidateQueries({ queryKey: ['vendors_admin'] });
      setOpen(false);
      setParsedRows([]);
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import Resources (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Vendor Resources</DialogTitle>
        </DialogHeader>

        {!parsedRows.length ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="link" onClick={generateTemplate} className="h-auto p-0 text-indigo-600">
                Download Sample Template
              </Button>
            </div>
            
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-sm font-medium text-slate-700">
                Drag & drop your CSV file here, or click to select
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium">
                Found {parsedRows.length} rows ({validCount} valid)
              </div>
              <Button variant="outline" size="sm" onClick={() => setParsedRows([])}>
                Upload Different File
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-md relative">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={!row.isValid ? "bg-red-50/50" : ""}>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div title={row.errors.join(', ')}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-xs">{row.data.provider_name}</TableCell>
                      <TableCell className="text-xs">{row.data.resource_name}</TableCell>
                      <TableCell className="text-xs uppercase">{row.data.type}</TableCell>
                      <TableCell className="text-xs">{row.data.default_rate || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isImporting && <UploadCloud className="h-4 w-4 animate-bounce" />}
                {isImporting ? `Importing... ${progress}%` : `Import ${validCount} Valid Resources`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
