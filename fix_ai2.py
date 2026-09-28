import sys
import re

with open('src/components/admin/AssetImportTool.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("import { Upload, Download, AlertCircle, Loader2 } from 'lucide-react';", "import { Upload, Download, AlertCircle, Loader2, FileText } from 'lucide-react';")

# First, replace the top blue box
top_pattern = r'<div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">\s*<div className="flex items-start gap-2">\s*<AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0\.5" />\s*<div className="space-y-2">\s*<p className="font-medium">Important formatting rules:</p>\s*<ul className="list-disc list-inside space-y-1 ml-1 text-blue-700">\s*<li><strong>Type</strong> must be one of: <code className="bg-blue-100 px-1 rounded">laptop</code>, <code className="bg-blue-100 px-1 rounded">hht</code>, <code className="bg-blue-100 px-1 rounded">phone</code>, <code className="bg-blue-100 px-1 rounded">monitor</code>, <code className="bg-blue-100 px-1 rounded">mouse</code>, <code className="bg-blue-100 px-1 rounded">other</code></li>\s*<li><strong>Status</strong> must be one of: <code className="bg-blue-100 px-1 rounded">available</code>, <code className="bg-blue-100 px-1 rounded">in_use</code>, <code className="bg-blue-100 px-1 rounded">maintenance</code></li>\s*<li><strong>Name</strong> is required for all assets\.</li>\s*</ul>\s*</div>\s*</div>\s*</div>'

new_top = r"""<div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-blue-800">Expected CSV Format:</p>
              <ul className="list-disc list-inside space-y-1 ml-1 text-blue-700">
                <li><code>Name</code> (required)</li>
                <li><code>Type</code> (<code className="bg-blue-100 px-1 rounded">laptop</code>, <code className="bg-blue-100 px-1 rounded">hht</code>, etc)</li>
                <li><code>Serial Number</code></li>
                <li><code>Status</code> (<code className="bg-blue-100 px-1 rounded">available</code>, <code className="bg-blue-100 px-1 rounded">in_use</code>)</li>
                <li><code>Notes</code></li>
              </ul>
            </div>
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
      </div>"""

text = re.sub(top_pattern, new_top, text)

# Second, remove the old download button at the bottom
bottom_pattern = r'<Button variant="outline" onClick=\{downloadTemplate\} className="flex-shrink-0">\s*<Download className="mr-2 h-4 w-4" />\s*Download Template\s*</Button>'

text = re.sub(bottom_pattern, "", text)

with open('src/components/admin/AssetImportTool.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: AssetImportTool updated.")
