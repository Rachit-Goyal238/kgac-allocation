import sys

with open('src/hooks/useAudits.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 57 to 83 (index 56 to 82)
del lines[56:83]

with open('src/hooks/useAudits.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
