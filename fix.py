import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if "import { useAuthContext } from '@/App'" in content:
                print('Replacing in', path)
                content = content.replace("import { useAuthContext } from '@/App'", "import { useAuthContext } from '@/contexts/AuthContext'")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
