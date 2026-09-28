import re

with open('src/components/admin/VendorResourceImporter.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add AlertCircle icon
text = text.replace("import { Upload, FileText, Check, AlertTriangle, Loader2 } from 'lucide-react';", "import { Upload, FileText, Check, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';")

old_ui = """            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="link" onClick={generateTemplate} className="h-auto p-0 text-indigo-600">
                  Download Sample Template
                </Button>
              </div>"""

new_ui = """            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center text-blue-800 mb-2">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <p className="font-medium mb-1">Expected CSV Format</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                    onClick={generateTemplate}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Download Template
                  </Button>
                </div>
                <p className="text-sm text-blue-800 mb-2">Your CSV should contain the following headers:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-800 opacity-90">
                  <li><code>Provider Name</code> (e.g. Deloitte)</li>
                  <li><code>Resource Name</code> (e.g. John Doe)</li>
                  <li><code>Type (man/asset)</code></li>
                  <li><code>Default Rate</code> (e.g. 500)</li>
                  <li><code>Contact Email</code> (optional)</li>
                </ul>
              </div>"""

text = text.replace(old_ui, new_ui)

with open('src/components/admin/VendorResourceImporter.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
