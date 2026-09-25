import os
import re
import subprocess
import sys
import markdown

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(WORKSPACE_DIR, "docs")
GUIDES_DIR = os.path.join(DOCS_DIR, "guides")
PDF_DIR = os.path.join(DOCS_DIR, "pdf")
SCREENSHOTS_DIR = os.path.join(DOCS_DIR, "screenshots")

os.makedirs(PDF_DIR, exist_ok=True)

CSS_STYLES = """
@page {
    size: A4;
    margin: 18mm 15mm 20mm 15mm;
    @bottom-right {
        content: "Page " counter(page);
    }
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    line-height: 1.6;
    font-size: 13px;
    background: #ffffff;
    margin: 0;
    padding: 0;
}

h1, h2, h3, h4, h5, h6 {
    color: #0f172a;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
}

h1 {
    font-size: 24px;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 0;
}

h2 {
    font-size: 18px;
    color: #1e3a8a;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 5px;
    margin-top: 28px;
}

h3 {
    font-size: 15px;
    color: #334155;
    margin-top: 20px;
}

h4 {
    font-size: 13.5px;
    color: #475569;
}

p {
    margin-top: 0;
    margin-bottom: 0.8em;
}

strong {
    font-weight: 600;
    color: #0f172a;
}

a {
    color: #2563eb;
    text-decoration: none;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px 0;
    font-size: 12px;
    page-break-inside: auto;
}

th, td {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    text-align: left;
}

th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
}

tr:nth-child(even) {
    background-color: #f8fafc;
}

ul, ol {
    margin-top: 0;
    margin-bottom: 12px;
    padding-left: 24px;
}

li {
    margin-bottom: 4px;
}

blockquote {
    margin: 14px 0;
    padding: 10px 16px;
    border-left: 4px solid #3b82f6;
    background-color: #eff6ff;
    color: #1e40af;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
}

blockquote p {
    margin: 0;
}

.alert-note {
    border-left-color: #3b82f6;
    background-color: #eff6ff;
    color: #1e40af;
}

.alert-tip {
    border-left-color: #10b981;
    background-color: #f0fdf4;
    color: #065f46;
}

.alert-important {
    border-left-color: #8b5cf6;
    background-color: #f5f3ff;
    color: #5b21b6;
}

.alert-warning {
    border-left-color: #f59e0b;
    background-color: #fffbeb;
    color: #92400e;
}

code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11.5px;
    background-color: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
}

pre {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 14px;
    border-radius: 6px;
    font-size: 11.5px;
    overflow-x: auto;
    page-break-inside: avoid;
}

pre code {
    background-color: transparent;
    padding: 0;
    color: inherit;
    border: none;
}

img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    margin: 12px 0;
    display: block;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    page-break-inside: avoid;
}

.caption {
    font-size: 11px;
    color: #64748b;
    text-align: center;
    margin-top: -6px;
    margin-bottom: 14px;
    font-style: italic;
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
}
.badge-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
.badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
.badge-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
.badge-gray { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }

.header-banner {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    padding: 24px 20px;
    border-radius: 8px;
    margin-bottom: 24px;
}
.header-banner h1 {
    color: #ffffff;
    border-bottom: none;
    margin: 0;
    font-size: 22px;
}
.header-banner p {
    color: #94a3b8;
    margin: 6px 0 0 0;
    font-size: 12.5px;
}

.footer-meta {
    margin-top: 30px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
}

.page-break {
    page-break-before: always;
}

.screenshot-placeholder {
    border: 2px dashed #94a3b8;
    background-color: #f8fafc;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 16px 0;
    text-align: center;
    page-break-inside: avoid;
}
.screenshot-placeholder .placeholder-badge {
    font-weight: 700;
    font-size: 12px;
    color: #1e3a8a;
    background-color: #dbeafe;
    padding: 4px 12px;
    border-radius: 9999px;
    display: inline-block;
    margin-bottom: 6px;
}
.screenshot-placeholder .placeholder-desc {
    font-size: 11px;
    color: #64748b;
    font-family: monospace;
}
.screenshot-container {
    margin: 14px 0;
    page-break-inside: avoid;
    text-align: center;
}
"""

def preprocess_markdown(md_text, base_dir):
    # Convert GitHub style alerts
    def alert_replacer(match):
        alert_type = match.group(1).lower()
        content = match.group(2).strip()
        css_class = f"alert-{alert_type}"
        return f'<blockquote class="{css_class}"><strong>{alert_type.upper()}:</strong> {content}</blockquote>'

    md_text = re.sub(r'>\s*\[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([^\n]+(?:\n>(?:[^\n]*))*)', alert_replacer, md_text, flags=re.IGNORECASE)

    # Clean markdown blockquote remnants in alerts
    md_text = re.sub(r'<blockquote class="alert-([^"]+)"><strong>([^<]+)</strong>\s*([\s\S]*?)</blockquote>',
                     lambda m: f'<blockquote class="alert-{m.group(1)}"><strong>{m.group(2)}</strong> {m.group(3).replace("> ", "")}</blockquote>',
                     md_text)

    # Normalize image paths to absolute file URIs or placeholders
    def img_replacer(match):
        alt = match.group(1)
        src = match.group(2)
        abs_img = None
        if src.startswith("file:///"):
            clean_path = src.replace("file:///", "").replace("/", "\\")
            if os.path.exists(clean_path):
                abs_img = clean_path
        elif not src.startswith("http"):
            c1 = os.path.abspath(os.path.join(base_dir, src))
            c2 = os.path.abspath(os.path.join(WORKSPACE_DIR, src))
            c3 = os.path.abspath(os.path.join(SCREENSHOTS_DIR, os.path.basename(src)))
            if os.path.exists(c1):
                abs_img = c1
            elif os.path.exists(c2):
                abs_img = c2
            elif os.path.exists(c3):
                abs_img = c3
        
        if abs_img and os.path.exists(abs_img):
            file_uri = "file:///" + abs_img.replace("\\", "/")
            return f'<div class="screenshot-container"><img src="{file_uri}" alt="{alt}" /><div class="caption">{alt}</div></div>'
        else:
            return f'''<div class="screenshot-placeholder">
  <div class="placeholder-badge">📸 SCREENSHOT: {alt}</div>
  <div class="placeholder-desc">Target File: <code>{src}</code></div>
</div>'''

    md_text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', img_replacer, md_text)

    # Handle [PAGE_BREAK] tag
    md_text = md_text.replace("[PAGE_BREAK]", '<div class="page-break"></div>')

    return md_text

def compile_md_to_pdf(md_path, pdf_path, title="KGAC Operations Guide"):
    with open(md_path, "r", encoding="utf-8") as f:
        raw_md = f.read()

    mermaid_blocks = []
    def mermaid_replacer(match):
        code = match.group(1)
        placeholder = f"MERMAID_BLOCK_{len(mermaid_blocks)}"
        mermaid_blocks.append(code)
        return placeholder

    raw_md = re.sub(r'```mermaid\n(.*?)\n```', mermaid_replacer, raw_md, flags=re.DOTALL)

    base_dir = os.path.dirname(md_path)
    processed_md = preprocess_markdown(raw_md, base_dir)

    html_body = markdown.markdown(
        processed_md,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"]
    )
    
    for i, code in enumerate(mermaid_blocks):
        # Mermaid code might have < or > which shouldn't be HTML parsed, but putting it in a div is what mermaid expects.
        html_body = html_body.replace(f"MERMAID_BLOCK_{i}", f'<div class="mermaid">\n{code}\n</div>')

    full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <style>
    {CSS_STYLES}
    .mermaid {{
        text-align: center;
        margin: 10px 0;
        page-break-inside: avoid;
    }}
    .mermaid svg {{
        max-height: 450px !important;
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
    }}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({{ startOnLoad: true, theme: 'default' }});
  </script>
</head>
<body>
  {html_body}
  <div class="footer-meta">
    <span>KGAC Operations & Allocation Platform</span>
    <span>Internal Operating Manual</span>
  </div>
</body>
</html>
"""

    temp_html_path = md_path.replace(".md", "_temp.html")
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        "--virtual-time-budget=5000",
        f"--print-to-pdf={pdf_path}",
        temp_html_path
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)

    if res.returncode == 0 and os.path.exists(pdf_path):
        print(f"[SUCCESS] Generated: {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path):,} bytes)")
        return True
    else:
        print(f"[FAILED]  Failed: {os.path.basename(pdf_path)}")
        print("Error:", res.stderr)
        return False

def compile_all():
    print(f"Starting compilation of all guides in {GUIDES_DIR}...")
    files = [f for f in os.listdir(GUIDES_DIR) if f.endswith(".md")]
    files.sort()

    success_count = 0
    for f in files:
        md_file = os.path.join(GUIDES_DIR, f)
        pdf_name = f.replace(".md", ".pdf")
        pdf_file = os.path.join(PDF_DIR, pdf_name)
        title = f.replace(".md", "").replace("_", " ")
        if compile_md_to_pdf(md_file, pdf_file, title):
            success_count += 1

    # Also compile root master guide if exists
    root_master = os.path.join(WORKSPACE_DIR, "USER_WALKTHROUGH_GUIDE.md")
    if os.path.exists(root_master):
        compile_md_to_pdf(root_master, os.path.join(PDF_DIR, "MASTER_USER_WALKTHROUGH_GUIDE.pdf"), "KGAC Master Guide")

    print(f"\nCompleted: {success_count} guides compiled to PDF in {PDF_DIR}")

if __name__ == "__main__":
    compile_all()
