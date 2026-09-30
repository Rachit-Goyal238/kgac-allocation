import sys

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add useSearchParams
import_router = "import { useSearchParams } from 'react-router-dom';\n"
text = text.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + import_router)

# Add URL logic inside BillingPage
old_state = "const [zoneFilter, setZoneFilter] = useState('');"
new_state = """const [zoneFilter, setZoneFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'audits';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });"""
text = text.replace(old_state, new_state)

# Replace defaultValue with value and onValueChange
text = text.replace('<Tabs defaultValue="audits" className="w-full">', '<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">')

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed BillingPage tab persistence via URL")
