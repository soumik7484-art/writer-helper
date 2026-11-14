"""
Document Parser Service
Handles PDF, DOCX, and TXT file parsing with intelligent chapter detection
"""
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path


class DocumentParser:
    """Parse story documents and intelligently extract chapters"""
    
    def __init__(self):
        self.chapter_patterns = [
            r'^Chapter\s+(\d+|[IVXLCDM]+)[\s:.\-—]*(.*)$',  # Chapter 1, Chapter I
            r'^(\d+)[\s.:\-—]+(.*)$',  # 1. Title, 1 - Title
            r'^Part\s+(\d+|[IVXLCDM]+)[\s:.\-—]*(.*)$',  # Part 1
            r'^Book\s+(\d+|[IVXLCDM]+)[\s:.\-—]*(.*)$',  # Book 1
            r'^Episode\s+(\d+)[\s:.\-—]*(.*)$',  # Episode 1
            r'^Scene\s+(\d+)[\s:.\-—]*(.*)$',  # Scene 1
            r'^Act\s+(\d+|[IVXLCDM]+)[\s:.\-—]*(.*)$',  # Act I
            r'^\*\*Chapter\s+(\d+|[IVXLCDM]+)[\s:.\-—]*(.*)\*\*$',  # **Chapter 1**
            r'^###\s+Chapter\s+(\d+|[IVXLCDM]+)[\s:.\-—]*(.*)$',  # ### Chapter 1
        ]
    
    def parse_txt(self, file_content: bytes) -> str:
        """Parse TXT file"""
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return file_content.decode('latin-1')
            except Exception:
                return file_content.decode('utf-8', errors='ignore')
    
    def parse_pdf(self, file_content: bytes) -> str:
        """Parse PDF file using PyPDF2"""
        try:
            import PyPDF2
            from io import BytesIO
            
            pdf_file = BytesIO(file_content)
            reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text())
            
            return '\n\n'.join(text_parts)
        except ImportError:
            return "[PDF parsing requires PyPDF2. Install with: pip install PyPDF2]"
        except Exception as e:
            return f"[PDF parsing error: {str(e)}]"
    
    def parse_docx(self, file_content: bytes) -> str:
        """Parse DOCX file using python-docx"""
        try:
            import docx
            from io import BytesIO
            
            docx_file = BytesIO(file_content)
            doc = docx.Document(docx_file)
            
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            return '\n\n'.join(text_parts)
        except ImportError:
            return "[DOCX parsing requires python-docx. Install with: pip install python-docx]"
        except Exception as e:
            return f"[DOCX parsing error: {str(e)}]"
    
    def parse_document(self, file_content: bytes, filename: str) -> str:
        """Parse document based on file extension"""
        ext = Path(filename).suffix.lower()
        
        if ext == '.pdf':
            return self.parse_pdf(file_content)
        elif ext in ['.docx', '.doc']:
            return self.parse_docx(file_content)
        elif ext == '.txt':
            return self.parse_txt(file_content)
        else:
            # Try as plain text
            return self.parse_txt(file_content)
    
    def detect_chapter_boundaries(self, text: str) -> List[Tuple[int, str, int]]:
        """
        Detect chapter boundaries in text
        Returns: List of (chapter_number, chapter_title, start_position)
        """
        lines = text.split('\n')
        chapters = []
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if not line_stripped:
                continue
            
            # Try each pattern
            for pattern in self.chapter_patterns:
                match = re.match(pattern, line_stripped, re.IGNORECASE)
                if match:
                    chapter_num_str = match.group(1)
                    chapter_title = match.group(2).strip() if len(match.groups()) > 1 else ""
                    
                    # Convert roman numerals or use number
                    try:
                        if chapter_num_str.isdigit():
                            chapter_num = int(chapter_num_str)
                        else:
                            chapter_num = self._roman_to_int(chapter_num_str)
                    except:
                        chapter_num = len(chapters) + 1
                    
                    # Find position in original text
                    position = sum(len(l) + 1 for l in lines[:i])
                    chapters.append((chapter_num, chapter_title, position))
                    break
        
        return chapters
    
    def _roman_to_int(self, s: str) -> int:
        """Convert roman numeral to integer"""
        roman_map = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
        s = s.upper()
        total = 0
        prev_value = 0
        
        for char in reversed(s):
            value = roman_map.get(char, 0)
            if value < prev_value:
                total -= value
            else:
                total += value
            prev_value = value
        
        return total if total > 0 else 1
    
    def auto_segment_by_breaks(self, text: str, target_chapters: int = 6) -> List[Dict[str, Any]]:
        """
        Auto-segment text into chapters based on natural breaks
        When no chapter markers are detected
        """
        # Split by multiple line breaks (scene breaks)
        paragraphs = re.split(r'\n\s*\n\s*\n+', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        if not paragraphs:
            return []
        
        # Calculate paragraphs per chapter
        paras_per_chapter = max(1, len(paragraphs) // target_chapters)
        
        chapters = []
        for i in range(target_chapters):
            start_idx = i * paras_per_chapter
            end_idx = start_idx + paras_per_chapter if i < target_chapters - 1 else len(paragraphs)
            
            if start_idx >= len(paragraphs):
                break
            
            chapter_paras = paragraphs[start_idx:end_idx]
            content = '\n\n'.join(chapter_paras)
            
            # Generate title from first sentence
            first_sentence = chapter_paras[0].split('.')[0][:60] if chapter_paras else ""
            title = f"Part {i + 1}: {first_sentence}..." if first_sentence else f"Part {i + 1}"
            
            chapters.append({
                'chapter_number': i + 1,
                'title': title,
                'content': content
            })
        
        return chapters
    
    def extract_chapters(self, text: str, target_chapter_count: int = 6) -> List[Dict[str, Any]]:
        """
        Main method: Extract chapters with intelligent detection
        Returns list of chapter dictionaries with number, title, content
        """
        # First, try to detect explicit chapter markers
        boundaries = self.detect_chapter_boundaries(text)
        
        if len(boundaries) >= 2:
            # Use detected chapters
            chapters = []
            for i, (num, title, start_pos) in enumerate(boundaries):
                # Get content until next chapter
                end_pos = boundaries[i + 1][2] if i < len(boundaries) - 1 else len(text)
                content = text[start_pos:end_pos].strip()
                
                # Remove the chapter heading from content
                content_lines = content.split('\n', 1)
                if len(content_lines) > 1:
                    content = content_lines[1].strip()
                
                if not title:
                    # Generate title from first line of content
                    first_line = content.split('\n')[0][:50] if content else ""
                    title = first_line + "..." if first_line else f"Chapter {num}"
                
                chapters.append({
                    'chapter_number': num,
                    'title': title,
                    'content': content
                })
            
            return chapters
        else:
            # No explicit chapters found, auto-segment
            return self.auto_segment_by_breaks(text, target_chapter_count)


document_parser = DocumentParser()
