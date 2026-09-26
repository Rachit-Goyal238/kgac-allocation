import sys

with open("src/components/auth/EntitySelector.tsx", "r", encoding="utf-8") as f:
    text = f.read()

new_div = """
          <div
            onClick={() => setSelectedEntity("XSPL")}
            className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent ${selectedEntity === "XSPL" ? "border-primary" : "border-muted bg-popover"}`}
          >
            <span className="text-xl font-bold">XSPL</span>
          </div>"""

text = text.replace("<span className=\"text-xl font-bold\">KPL</span>\n          </div>", "<span className=\"text-xl font-bold\">KPL</span>\n          </div>" + new_div)

with open("src/components/auth/EntitySelector.tsx", "w", encoding="utf-8") as f:
    f.write(text)
