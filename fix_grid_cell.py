import sys

with open('src/components/grid/GridCell.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = "return diffDays >= -14 && diffDays <= 14;"
new_block = "return diffDays >= -3 && diffDays <= 7;"

text = text.replace(old_block, new_block)

with open('src/components/grid/GridCell.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: Updated GridCell edit restrictions.")
