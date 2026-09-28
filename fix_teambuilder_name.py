import sys

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Unknown Project
old_text = "<div className=\"font-medium text-sm\">{audit.project?.name || 'Unknown Project'}</div>"
new_text = "<div className=\"font-medium text-sm\">{audit.store_name || audit.project?.name || 'Unknown Project'}</div>"

text = text.replace(old_text, new_text)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: TeamBuilder updated.")
