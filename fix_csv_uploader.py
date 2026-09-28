import sys
import re

with open('src/components/admin/CSVUploader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add AlertCircle and FileText imports
text = text.replace("import { Upload, FileUp, AlertTriangle, Check, X, Download } from 'lucide-react';", "import { Upload, FileUp, AlertTriangle, Check, X, Download, AlertCircle, FileText } from 'lucide-react';")
text = text.replace("import { Upload, FileUp, AlertTriangle, Check, X, Download, AlertCircle } from 'lucide-react';", "import { Upload, FileUp, AlertTriangle, Check, X, Download, AlertCircle, FileText } from 'lucide-react';")

# Replace old UI
old_ui = r'<div className="flex justify-center">\s*<Button variant="link" size="sm" onClick=\{downloadTemplate\}>\s*<Download className="mr-2 h-4 w-4" /> Download Sample Template\s*</Button>\s*</div>'

new_ui = r"""<div className="bg-blue-50 border border-blue-100 rounded-md p-4 mt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center text-blue-800 mb-2">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <p className="font-medium mb-1">Expected CSV Format</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                    onClick={downloadTemplate}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Download Template
                  </Button>
                </div>
                <p className="text-sm text-blue-800 mb-2">Your CSV should contain the following headers:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-800 opacity-90">
                  <li><code>Employee ID</code></li>
                  <li><code>First Name</code> & <code>Last Name</code></li>
                  <li><code>Personal Email</code> (for login invite)</li>
                  <li><code>Phone Number</code></li>
                  <li><code>Role</code> (e.g. audit_executive, audit_lead)</li>
                  <li><code>Department</code>, <code>Entity</code>, <code>Zone</code></li>
                </ul>
              </div>"""

text = re.sub(old_ui, new_ui, text)

with open('src/components/admin/CSVUploader.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: CSVUploader updated.")
