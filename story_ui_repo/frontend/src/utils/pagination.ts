/**
 * StoryWeave AI — Virtual Manuscript Pagination Engine
 * Splits continuous chapter narrative into fixed-capacity virtual book pages,
 * adapting to font size, font family, line heights, and paragraph boundaries.
 */

export interface PaginationOptions {
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  customMaxChars?: number;
}

/**
 * Calculates adaptive character capacity per manuscript page based on typography settings.
 * A standard page at 18px font holds ~1250 characters (~200-240 words).
 * As font size increases (e.g. 28px), capacity decreases (~650 chars).
 * As font size decreases (e.g. 12px), capacity increases (~1900 chars).
 */
export function calculatePageCapacity(options?: PaginationOptions): number {
  const fontSize = options?.fontSize || 18;
  if (options?.customMaxChars) return options.customMaxChars;

  // Non-linear scaling based on font size surface area
  const scale = Math.pow(18 / Math.max(10, Math.min(48, fontSize)), 1.25);
  return Math.round(1250 * scale);
}

/**
 * Splits a long HTML paragraph or block into clean sentence chunks.
 */
function splitBlockIntoSentences(blockHtml: string, maxChars: number): string[] {
  // If block is already within budget, return as is
  if (blockHtml.length <= maxChars) {
    return [blockHtml];
  }

  // Parse text content to inspect length
  const temp = document.createElement('div');
  temp.innerHTML = blockHtml;
  const rawText = temp.textContent || '';

  if (rawText.length <= maxChars) {
    return [blockHtml];
  }

  // Split text by sentence terminators (. ! ?)
  const sentenceMatches = rawText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!sentenceMatches || sentenceMatches.length <= 1) {
    // If no sentence terminators found, split by word chunks
    const words = rawText.split(/\s+/);
    const chunks: string[] = [];
    let currentWords: string[] = [];
    let currentCount = 0;

    for (const w of words) {
      if (currentWords.length > 0 && currentCount + w.length > maxChars) {
        chunks.push(`<p>${currentWords.join(' ')}</p>`);
        currentWords = [w];
        currentCount = w.length;
      } else {
        currentWords.push(w);
        currentCount += w.length + 1;
      }
    }
    if (currentWords.length > 0) {
      chunks.push(`<p>${currentWords.join(' ')}</p>`);
    }
    return chunks;
  }

  const chunks: string[] = [];
  let currentSentences: string[] = [];
  let currentCount = 0;

  for (const s of sentenceMatches) {
    if (currentSentences.length > 0 && currentCount + s.length > maxChars) {
      chunks.push(`<p>${currentSentences.join(' ').trim()}</p>`);
      currentSentences = [s];
      currentCount = s.length;
    } else {
      currentSentences.push(s);
      currentCount += s.length;
    }
  }

  if (currentSentences.length > 0) {
    chunks.push(`<p>${currentSentences.join(' ').trim()}</p>`);
  }

  return chunks.length > 0 ? chunks : [blockHtml];
}

/**
 * Parses raw chapter HTML into discrete virtual pages.
 */
export function parseContentToPages(rawContent: string, options?: PaginationOptions): string[] {
  if (!rawContent || !rawContent.trim() || rawContent === '<p><br></p>') {
    return ['<p><br></p>'];
  }

  // 1. Check for explicit page break comments
  if (/<!--\s*(?:story-)?page-?break\s*-->/i.test(rawContent)) {
    const rawPages = rawContent
      .split(/<!--\s*(?:story-)?page-?break\s*-->/gi)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (rawPages.length > 0) {
      return rawPages;
    }
  }

  // 2. Normalize raw content to paragraph blocks if needed
  let normalized = rawContent;
  if (!normalized.includes('<p>') && !normalized.includes('<div>') && !normalized.includes('<br>')) {
    normalized = rawContent
      .split(/\n\n+/)
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // 3. Dynamic block-level pagination
  const maxChars = calculatePageCapacity(options);
  const container = document.createElement('div');
  container.innerHTML = normalized;

  const children = Array.from(container.children);
  if (children.length === 0) {
    // If only text nodes or loose markup
    if (container.textContent && container.textContent.trim()) {
      return splitBlockIntoSentences(`<p>${container.innerHTML}</p>`, maxChars);
    }
    return ['<p><br></p>'];
  }

  const pages: string[] = [];
  let currentPageParts: string[] = [];
  let currentPageCharCount = 0;

  for (const child of children) {
    const el = child as HTMLElement;
    const blockHtml = el.outerHTML;
    const blockTextLen = (el.textContent || '').length;

    // If a single block exceeds the max characters, split it into sentence chunks
    if (blockTextLen > maxChars) {
      const subChunks = splitBlockIntoSentences(blockHtml, maxChars);
      for (const chunk of subChunks) {
        const chunkLen = (chunk.replace(/<[^>]*>/g, '') || '').length;
        if (currentPageParts.length > 0 && currentPageCharCount + chunkLen > maxChars) {
          pages.push(currentPageParts.join(''));
          currentPageParts = [chunk];
          currentPageCharCount = chunkLen;
        } else {
          currentPageParts.push(chunk);
          currentPageCharCount += chunkLen;
        }
      }
      continue;
    }

    // Normal block
    if (currentPageParts.length > 0 && currentPageCharCount + blockTextLen > maxChars) {
      pages.push(currentPageParts.join(''));
      currentPageParts = [blockHtml];
      currentPageCharCount = blockTextLen;
    } else {
      currentPageParts.push(blockHtml);
      currentPageCharCount += blockTextLen;
    }
  }

  if (currentPageParts.length > 0) {
    pages.push(currentPageParts.join(''));
  }

  return pages.length > 0 ? pages : ['<p><br></p>'];
}

/**
 * Combines virtual pages back into a continuous chapter document string.
 */
export function combinePagesToContent(pages: string[]): string {
  if (!pages || pages.length === 0) return '';
  return pages.filter(p => p && p.trim() !== '<p><br></p>').join('<!-- story-page-break -->');
}
