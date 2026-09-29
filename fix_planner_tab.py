import sys

with open('src/pages/PlannerPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace React Router imports - need useSearchParams
old_imports = "import React, { useState } from 'react';"
new_imports = "import React from 'react';\nimport { useSearchParams } from 'react-router-dom';"
text = text.replace(old_imports, new_imports)

# Replace useState tab with URL-based tab
old_state = "  const [activeTab, setActiveTab] = useState('import');"
new_state = """  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'import';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });"""
text = text.replace(old_state, new_state)

with open('src/pages/PlannerPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed PlannerPage tab persistence via URL")
