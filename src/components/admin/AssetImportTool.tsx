import React, { useState } from 'react';
import { Upload, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Papa from 'papaparse';

export function AssetImportTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Type', 'Serial Number', 'Status', 'Notes'];
    const sampleData = [
      ['ThinkPad T14', 'laptop', 'PF123456', 'available', 'New batch 2026'],
      ['Zebra TC52', 'hht', 'ZBR98765', 'available', 'Scanner'],
      ['iPhone 14', 'phone', 'IPH112233', 'available', 'Test device'],
      ['Dell 27 Monitor', 'monitor', 'DEL4455', 'available', 'Desk 12'],
      ['Logitech MX Master', 'mouse', 'LOG999', 'available', ''],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'asset_import_template.csv';
    link.click();
  };

  const processImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const rows = results.data as any[];
              if (rows.length === 0) throw new Error('File is empty');

              // Format rows for insertion
              const formattedAssets = rows.map((row, index) => {
                const name = row['Name']?.trim();
                let type = row['Type']?.trim().toLowerCase() || 'other';
                const serial = row['Serial Number']?.trim() || '';
                let status = row['Status']?.trim().toLowerCase() || 'available';
                const notes = row['Notes']?.trim() || '';

                if (!name) throw new Error(`Row ${index + 1}: Name is required`);

                // Normalize type
                const validTypes = ['laptop', 'monitor', 'hht', 'phone', 'mouse', 'other'];
                if (!validTypes.includes(type)) type = 'other';

                // Normalize status
                const validStatuses = ['available', 'in_use', 'maintenance'];
                if (!validStatuses.includes(status)) status = 'available';

                return {
                  name,
                  type,
                  serial_number: serial,
                  status,
                  notes,
                  assigned_to: null
                };
              });

              // Bulk insert
              const { error } = await supabase.from('internal_assets').insert(formattedAssets);
              if (error) throw error;
              
              resolve(formattedAssets.length);
            } catch (err: any) {
              reject(err);
            }
          },
          error: (error) => {
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          }
        });
      });
    },
    onMutate: () => setIsProcessing(true),
    onSuccess: (count) => {
      toast.success(`Successfully imported ${count} assets`);
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('asset-import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to import assets');
    },
    onSettled: () => setIsProcessing(false)
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900">Mass Asset Onboarding</h3>
        <p className="text-sm text-slate-500 mt-1">Upload a CSV file to import multiple internal assets at once.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium">Important formatting rules:</p>
            <ul className="list-disc list-inside space-y-1 ml-1 text-blue-700">
              <li><strong>Type</strong> must be one of: <code className="bg-blue-100 px-1 rounded">laptop</code>, <code className="bg-blue-100 px-1 rounded">hht</code>, <code className="bg-blue-100 px-1 rounded">phone</code>, <code className="bg-blue-100 px-1 rounded">monitor</code>, <code className="bg-blue-100 px-1 rounded">mouse</code>, <code className="bg-blue-100 px-1 rounded">other</code></li>
              <li><strong>Status</strong> must be one of: <code className="bg-blue-100 px-1 rounded">available</code>, <code className="bg-blue-100 px-1 rounded">in_use</code>, <code className="bg-blue-100 px-1 rounded">maintenance</code></li>
              <li><strong>Name</strong> is required for all assets.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <Button variant="outline" onClick={downloadTemplate} className="flex-shrink-0">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
        
        <div className="flex-1 flex gap-2 w-full">
          <input
            id="asset-import-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="flex-1 block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 border border-slate-200 rounded-md p-0 focus:outline-none"
            disabled={isProcessing}
          />
          <Button 
            onClick={() => processImport.mutate()} 
            disabled={!file || isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Data
          </Button>
        </div>
      </div>
    </div>
  );
}
