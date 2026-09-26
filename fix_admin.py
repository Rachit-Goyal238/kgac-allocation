import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<SelectItem value="KPL">KPL</SelectItem>
                        <SelectItem value="XSPL">XSPL</SelectItem>', '<SelectItem value="KPL">KPL</SelectItem>\n                        <SelectItem value="XSPL">XSPL</SelectItem>')

with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
