"""File parsing utilities for DOCX, PDF, and HTML files."""

import io
from typing import Optional


def parse_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


def parse_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def parse_html(content: bytes) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(content, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def parse_file(filename: str, content: bytes) -> Optional[str]:
    """Parse a file and return its text content. Returns None for unsupported types."""
    lower = filename.lower()
    if lower.endswith(".docx"):
        return parse_docx(content)
    elif lower.endswith(".pdf"):
        return parse_pdf(content)
    elif lower.endswith((".html", ".htm")):
        return parse_html(content)
    return None
