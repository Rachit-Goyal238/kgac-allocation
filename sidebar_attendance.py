import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

nav_str = """          <NavLink to="/assets" icon={HardHat} label="Assets" isExpanded={isExpanded} />"""
new_nav = """          <NavLink to="/assets" icon={HardHat} label="Assets" isExpanded={isExpanded} />
          {isManagerOrAdmin && <NavLink to="/attendance" icon={Clock} label="Attendance" isExpanded={isExpanded} />}"""
          
text = text.replace(nav_str, new_nav)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Injected Attendance Link into Sidebar")
