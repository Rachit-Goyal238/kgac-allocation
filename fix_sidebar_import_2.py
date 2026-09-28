import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("} from 'lucide-react';", "  CheckSquare\n} from 'lucide-react';")

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed CheckSquare import")
