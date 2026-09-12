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

            const safeDate = (dateStr: string) => {
              if (!dateStr) return new Date().toISOString().split('T')[0];
              const clean = dateStr.trim();
              
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
              store_name: getField(row, ['store', 'name']) || 'Unknown Store',
              store_code: getField(row, ['code']) || null,
              location: getField(row, ['location', 'city', 'address']) || null,
              audit_date: safeDate(getField(row, ['date'])),
              audit_type: getField(row, ['type', 'audit type']) || 'General',
              status: 'scheduled',
              billing_amount: Number(getField(row, ['fee', 'amount', 'price', 'revenue', 'billing'])) || 0
            }));

            if (audits.length === 0) {
              toast.error('No valid rows found in CSV');
              setIsUploading(false);
              return;
            }

            const { error } = await supabase.from('audits').insert(audits);
            if (error) throw error;

            toast.success(`Successfully imported ${audits.length} audits!`);
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
            <div>
              <p className="font-medium mb-1">Expected CSV Format</p>
              <p>Your CSV should contain the following headers: <code>Store Name</code>, <code>Store Code</code>, <code>Location</code>, <code>Audit Date</code> (YYYY-MM-DD), and <code>Audit Type</code>.</p>
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
