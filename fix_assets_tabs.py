import sys
import re

with open('src/pages/AssetsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add useSearchParams
import_router = "import { useSearchParams } from 'react-router-dom';\n"
text = text.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + import_router)

# Replace useState with useSearchParams
old_state = "const [activeTab, setActiveTab] = useState('dashboard');"
new_state = """const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });"""
text = text.replace(old_state, new_state)

with open('src/pages/AssetsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed AssetsPage tab persistence via URL")
