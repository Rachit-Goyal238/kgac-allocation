import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import Papa from 'papaparse';

export function AuditImportTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [clientId, setClientId] = useState<string>('');

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      return data;
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || !clientId) return;
    setIsUploading(true);

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const getField = (row: any, searchTerms: string[]) => {
              const key = Object.keys(row).find(k => searchTerms.some(term => k.toLowerCase().includes(term)));
              return key ? row[key] : null;
            };

            const safeNumber = (val: any) => {
              if (val === null || val === undefined || val === '') return 0;
              if (typeof val === 'number') return val;
              const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
              const num = parseFloat(cleanStr);
              return isNaN(num) ? 0 : num;
            };

            const safeString = (val: any, fallback: any = null) => {
              if (val === null || val === undefined) return fallback;
              const str = String(val).trim();
              return str === '' ? fallback : str;
            };

            const safeDate = (dateStr: any) => {
              if (!dateStr) return new Date().toISOString().split('T')[0];
              const clean = String(dateStr).trim();
              
              // First try DD-MM-YYYY or DD/MM/YYYY
              const parts = clean.split(/[-/]/);
              if (parts.length === 3) {
                // assume DD-MM-YYYY (parts[0] is DD, parts[1] is MM, parts[2] is YYYY)
                // Use local time construction to avoid timezone shifting
                const year = parseInt(parts[2].trim());
                const month = parseInt(parts[1].trim()) - 1; // 0-indexed
                const day = parseInt(parts[0].trim());
                
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                  const d = new Date(year, month, day, 12, 0, 0); // Noon to avoid timezone boundary issues
                  return d.toISOString().split('T')[0];
                }
              }
              
              // Try standard parse as fallback
              const d = new Date(clean);
              if (!isNaN(d.getTime())) {
                // Avoid timezone boundary issues by setting hours to noon
                d.setHours(12, 0, 0);
                return d.toISOString().split('T')[0];
              }
              
              return new Date().toISOString().split('T')[0]; // Fallback
            };

            const audits = results.data.map((row: any) => ({
              client_id: clientId,
              store_name: safeString(getField(row, ['store', 'name']), 'Unknown Store'),
              store_code: safeString(getField(row, ['code'])),
              location: safeString(getField(row, ['location', 'city', 'address'])),
              audit_date: safeDate(getField(row, ['date'])),
              audit_type: safeString(getField(row, ['type', 'audit type']), 'General'),
              status: 'scheduled',
              billing_amount: safeNumber(getField(row, ['fee', 'amount', 'price', 'revenue', 'billing'])),
              required_leads: safeNumber(getField(row, ['leads', 'required leads', 'lead count'])),
              required_executives: safeNumber(getField(row, ['executives', 'required executives', 'executive count']))
            }));

            if (audits.length === 0) {
              toast.error('No valid rows found in CSV');
              setIsUploading(false);
              return;
            }

            // Fetch existing audits for this client to prevent duplicates
            const { data: existingAudits, error: fetchError } = await supabase
              .from('audits')
              .select('id, store_name, audit_date')
              .eq('client_id', clientId);
              
            if (fetchError) throw fetchError;

            let updatedCount = 0;
            let newCount = 0;

            const toUpsert = audits.map((newAudit: any) => {
              // Check if an audit for this exact store and date already exists
              const match = existingAudits?.find(ea => 
                ea.store_name?.toLowerCase().trim() === newAudit.store_name?.toLowerCase().trim() && 
                ea.audit_date === newAudit.audit_date
              );

              if (match) {
                updatedCount++;
                return { ...newAudit, id: match.id }; // Passing the existing ID forces an UPDATE
              }
              
              newCount++;
              // MUST provide a generated ID so PostgREST sees uniform keys across all objects
              return { ...newAudit, id: crypto.randomUUID() }; 
            });

            const { error } = await supabase.from('audits').upsert(toUpsert);
            if (error) throw error;

            toast.success(`Successfully imported! (${newCount} new, ${updatedCount} updated)`);
            setFile(null);
            // Optionally clear file input
          } catch (err: any) {
            console.error('Import error:', err);
            toast.error(err.message || 'Error processing CSV');
          } finally {
            setIsUploading(false);
          }
        },
        error: (error: any) => {
          console.error('CSV Parsing error:', error);
          toast.error(`CSV Parsing error: ${error.message}`);
          setIsUploading(false);
        }
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to read file');
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Audits</CardTitle>
        <CardDescription>Upload a CSV file containing audit assignments from a client.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Client</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            >
              <option value="">-- Select Client --</option>
              {clients?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center">
              {file ? (
                <>
                  <FileText className="h-10 w-10 text-blue-500 mb-2" />
                  <span className="font-medium text-gray-900">{file.name}</span>
                  <span className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="font-medium text-gray-900">Click to upload or drag and drop</span>
                  <span className="text-sm text-gray-500 mt-1">CSV files only</span>
                </>
              )}
            </label>
          </div>

          <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="w-full">
              <div className="flex justify-between items-start">
                <p className="font-medium mb-1">Expected CSV Format</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Store Name,Store Code,Location,Audit Date (DD-MM-YYYY),Audit Type,Billing Amount,Required Leads,Required Executives\nDemo Store,DEMO-001,New York,25-10-2026,General,1500,1,2";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "audit_import_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Download Template
                </Button>
              </div>
              <p className="mb-2">Your CSV should contain the following headers:</p>
              <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                <li><code>Store Name</code></li>
                <li><code>Store Code</code> (optional)</li>
                <li><code>Location</code></li>
                <li><code>Audit Date</code> (DD-MM-YYYY or YYYY-MM-DD)</li>
                <li><code>Audit Type</code></li>
                <li><code>Billing Amount</code> (optional)</li>
                <li><code>Required Leads</code> (number of Team Leads needed)</li>
                <li><code>Required Executives</code> (number of Executives needed)</li>
              </ul>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleImport} 
            disabled={!file || !clientId || isUploading}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Audits
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
