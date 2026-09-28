import sys
import re

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add CheckSquare if not there
if 'CheckSquare' not in text:
    text = text.replace("import {", "import { CheckSquare,", 1)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added CheckSquare import")
