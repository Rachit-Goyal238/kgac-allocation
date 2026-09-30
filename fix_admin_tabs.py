import sys
import re

with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the activeTab parsing logic
old_logic = """    // Determine active tab from URL path
    let activeTab = 'users';
    if (location.pathname.includes('/admin/audit-log')) activeTab = 'audit-log';
    if (location.pathname.includes('/admin/database')) activeTab = 'database';"""

new_logic = """    // Determine active tab from URL path
    const pathParts = location.pathname.split('/');
    const tabFromUrl = pathParts[pathParts.length - 1];
    
    // Default to users if root or unknown, otherwise use the path
    const validTabs = ['users', 'departments', 'projects', 'vendors', 'clients', 'settings', 'audit-log', 'database'];
    const activeTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'users';"""

text = text.replace(old_logic, new_logic)

with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed AdminPage URL persistence")
