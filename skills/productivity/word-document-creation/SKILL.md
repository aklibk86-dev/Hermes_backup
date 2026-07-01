---
name: word-document-creation
category: productivity
description: "Create formatted Word (.docx) documents from web content, blog posts, or structured data using python-docx. Covers content extraction, document structuring (headings, tables, code blocks, lists), styling, and file delivery."
tags: [docx, word, document, python-docx, export]
---

# Word Document Creation (.docx)

Create rich, formatted Word documents from web pages, articles, or structured data. Uses the `python-docx` library.

## Prerequisites

```bash
uv pip install python-docx
```

## Workflow

### 1. Extract Source Content

For blog posts/articles, fetch the content via curl + Python HTML extraction:

```bash
curl -sL "<url>" | python3 -c "
import sys, re, html
content = sys.stdin.read()
# Extract article body
match = re.search(r'<article[^>]*>(.*?)</article>', content, re.DOTALL)
article = match.group(1) if match else content
# Strip tags for plain text
clean = re.sub(r'<[^>]+>', '', article)
clean = html.unescape(clean)
# Collapse excess blank lines
clean = re.sub(r'\n\s*\n\s*\n', '\n\n', clean)
print(clean)
"
```

Or use the browser tool for JS-rendered pages.

### 2. Build the Document

Create a Python script with `python-docx`. Key patterns:

```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

doc = Document()

# Set default font
style = doc.styles['Normal']
font = style.font
font.name = '微软雅黑'
font.size = Pt(11)
style.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')

# Heading styles
for level, size in [(1, 22), (2, 16), (3, 13)]:
    hs = doc.styles[f'Heading {level}']
    hs.font.name = '微软雅黑'
    hs.font.size = Pt(size)
    hs.font.bold = True
    hs.font.color.rgb = RGBColor(0x1a, 0x1a, 0x2e)
    hs.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')

# Title (level 0 heading, centered)
title = doc.add_heading('Title', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Tables
def add_table(doc, rows):
    table = doc.add_table(rows=len(rows), cols=2)
    table.style = 'Light Grid Accent 1'
    for i, (key, val) in enumerate(rows):
        table.rows[i].cells[0].text = key
        table.rows[i].cells[1].text = val
    return table

# Code blocks
def add_code_block(doc, code_text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9.5)
    # Add grey background shading
    shading = p._element.get_or_add_pPr()
    shd = shading.makeelement(qn('w:shd'), {
        qn('w:val'): 'clear', qn('w:color'): 'auto', qn('w:fill'): 'F5F5F5'
    })
    shading.append(shd)

# Bullet lists
def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(text, style='List Bullet')
    if level > 0:
        p.paragraph_format.left_indent = Inches(0.5 * (level + 1))

# Highlighted notes
def add_note(doc, label, text):
    p = doc.add_paragraph()
    r = p.add_run(f'{label} ')
    r.font.bold = True
    r.font.color.rgb = RGBColor(0xcc, 0x66, 0x00)
    p.add_run(text)

# Save
doc.save('output.docx')
```

### 3. Key Styling Patterns

| Element | Approach |
|---------|----------|
| Regular text | `doc.add_paragraph('text')` |
| Bold inline | `run.bold = True` |
| Code/inline | `run.font.name = 'Consolas'; run.font.size = Pt(9.5)` |
| Colored text | `run.font.color.rgb = RGBColor(r, g, b)` |
| Links | `p.add_run(url).font.color.rgb = RGBColor(0x0d, 0x47, 0xa1)` |
| Separator | `doc.add_paragraph('─' * 50)` with grey color + small font |
| Indented content | `p.paragraph_format.left_indent = Inches(0.5)` |

### 4. Deliver the File

In Feishu conversation, include the file path in the response as a MEDIA attachment:

```
MEDIA:/opt/data/workspace/output.docx
```

## Pitfalls

1. **python-docx not in global python** — install with `uv pip install python-docx`, then run script with `uv run python3 script.py`
2. **Font fallback** — Chinese fonts (微软雅黑) only render on Chinese-locale systems. For cross-platform, use a generic sans-serif
3. **Code block overflow** — Long code lines don't wrap in Word. Keep code samples under ~80 chars per line, or use smaller font
4. **Table overflow** — Tables with long text in cells may overflow page width. Keep cell content concise
5. **HTML extraction** — Simple regex stripping loses structure (bold, links, lists). For production, use `beautifulsoup4` to preserve HTML semantics
6. **File too large for MEDIA delivery** — If the docx is over ~20MB, upload to a file server and share the URL instead

## Example Use Cases

- Blog post → Word document export
- Documentation page → formatted .docx
- API documentation → structured Word doc with tables and code blocks
- Markdown → .docx conversion
