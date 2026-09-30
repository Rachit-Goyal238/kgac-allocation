import sys
import re

with open('src/pages/AssetsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def replace_tabs_content(match):
    value = match.group(1)
    rest = match.group(2)
    return f'<TabsContent value="{value}" forceMount hidden={{activeTab !== "{value}"}} {rest}'

text = re.sub(r'<TabsContent\s+value="([^"]+)"\s*(.*?)', replace_tabs_content, text)

with open('src/pages/AssetsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated AssetsPage TabsContent")
