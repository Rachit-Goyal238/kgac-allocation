import sys
import re

with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace <TabsContent value="xxx" className="yyy"> 
# with <TabsContent value="xxx" forceMount hidden={activeTab !== 'xxx'} className="yyy">

def replace_tabs_content(match):
    value = match.group(1)
    rest = match.group(2)
    return f'<TabsContent value="{value}" forceMount hidden={{activeTab !== "{value}"}} {rest}'

text = re.sub(r'<TabsContent\s+value="([^"]+)"\s*(.*?)', replace_tabs_content, text)

with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated AdminPage TabsContent")
