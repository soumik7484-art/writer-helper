import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Indent, 
  Outdent, 
  Undo, 
  Redo, 
  Type, 
  Palette, 
  Highlighter, 
  ChevronDown,
  RemoveFormatting
} from 'lucide-react';

export interface RichTextToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onContentChange: () => void;
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36];

const FONT_FAMILIES = [
  { name: 'Playfair Display', label: 'Playfair (Editorial)', font: "'Playfair Display', serif" },
  { name: 'Inter', label: 'Inter (Clean Sans)', font: "'Inter', sans-serif" },
  { name: 'Libre Caslon Display', label: 'Libre Caslon (Literary)', font: "'Libre Caslon Display', serif" },
  { name: 'Courier Prime', label: 'Courier (Typewriter)', font: "'Courier Prime', monospace" },
  { name: 'Caveat', label: 'Caveat (Handwritten)', font: "'Caveat', cursive" },
  { name: 'Cinzel', label: 'Cinzel (Classical)', font: "'Cinzel', serif" },
  { name: 'Berkshire Swash', label: 'Berkshire (Wizard)', font: "'Berkshire Swash', cursive" }
];

const TEXT_COLORS = [
  { label: 'Espresso Ink', value: '#221811' },
  { label: 'Deep Sepia', value: '#4A2E18' },
  { label: 'Crimson Seal', value: '#8B261E' },
  { label: 'Antique Amber', value: '#A05A18' },
  { label: 'Forest Green', value: '#1B4332' },
  { label: 'Midnight Blue', value: '#1D3557' },
  { label: 'Royal Purple', value: '#5B2C6F' },
  { label: 'Charcoal Grey', value: '#4B4846' }
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent' },
  { label: 'Warm Gold', value: 'rgba(247, 213, 71, 0.42)' },
  { label: 'Amber Flame', value: 'rgba(255, 183, 77, 0.42)' },
  { label: 'Sage Whisper', value: 'rgba(165, 214, 167, 0.42)' },
  { label: 'Sky Azure', value: 'rgba(144, 202, 249, 0.42)' },
  { label: 'Rose Clue', value: 'rgba(239, 154, 154, 0.42)' },
  { label: 'Arcane Violet', value: 'rgba(206, 147, 216, 0.42)' }
];

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editorRef, onContentChange }) => {
  // Format States
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [isBulletList, setIsBulletList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);

  // Dropdown States
  const [currentFontSize, setCurrentFontSize] = useState<number>(18);
  const [customSizeInput, setCustomSizeInput] = useState<string>('18');
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const [currentFontFamily, setCurrentFontFamily] = useState<string>('Playfair Display');
  const [showFontMenu, setShowFontMenu] = useState(false);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState<string>('#221811');

  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<string>('transparent');

  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);

  // Click outside listener for all dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(target)) setShowSizeMenu(false);
      if (fontMenuRef.current && !fontMenuRef.current.contains(target)) setShowFontMenu(false);
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) setShowColorPicker(false);
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(target)) setShowHighlightPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update Toolbar States based on Current Selection
  const updateToolbarState = () => {
    if (!editorRef.current) return;
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsStrike(document.queryCommandState('strikeThrough'));
      setIsBulletList(document.queryCommandState('insertUnorderedList'));
      setIsOrderedList(document.queryCommandState('insertOrderedList'));

      if (document.queryCommandState('justifyCenter')) setAlignment('center');
      else if (document.queryCommandState('justifyRight')) setAlignment('right');
      else if (document.queryCommandState('justifyFull')) setAlignment('justify');
      else setAlignment('left');

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.anchorNode) {
        const parent = selection.anchorNode.nodeType === 3 
          ? selection.anchorNode.parentElement 
          : (selection.anchorNode as HTMLElement);

        if (parent && editorRef.current.contains(parent)) {
          const comp = window.getComputedStyle(parent);
          const pxSize = parseInt(comp.fontSize, 10);
          if (pxSize && !isNaN(pxSize)) {
            setCurrentFontSize(pxSize);
            setCustomSizeInput(pxSize.toString());
          }
          if (comp.color) {
            setCurrentColor(comp.color);
          }
          const matchedFont = FONT_FAMILIES.find(f => 
            comp.fontFamily.toLowerCase().includes(f.name.toLowerCase())
          );
          if (matchedFont) {
            setCurrentFontFamily(matchedFont.name);
          }
        }
      }
    } catch {
      // Quiet fail on unsupported selection
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !editorRef.current) return;
      if (editorRef.current.contains(selection.anchorNode)) {
        updateToolbarState();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  // Execute standard formatting commands
  const execCmd = (cmd: string, val: string | null = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, val ?? undefined);
    updateToolbarState();
    onContentChange();
  };

  // Font Size Application
  const applyFontSize = (sizePx: number) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setCurrentFontSize(sizePx);
    setCustomSizeInput(sizePx.toString());
    setShowSizeMenu(false);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = `${sizePx}px`;
      span.innerHTML = '&#8203;';
      range.insertNode(span);
      range.setStart(span.childNodes[0], 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      document.execCommand('fontSize', false, '7');
      const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
      fontElements.forEach(el => {
        el.removeAttribute('size');
        (el as HTMLElement).style.fontSize = `${sizePx}px`;
      });
    }
    updateToolbarState();
    onContentChange();
  };

  // Font Family Application
  const applyFontFamily = (family: typeof FONT_FAMILIES[0]) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setCurrentFontFamily(family.name);
    setShowFontMenu(false);
    document.execCommand('fontName', false, family.font);
    updateToolbarState();
    onContentChange();
  };

  // Text Color Application
  const applyTextColor = (color: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setCurrentColor(color);
    setShowColorPicker(false);
    document.execCommand('foreColor', false, color);
    updateToolbarState();
    onContentChange();
  };

  // Highlight Application
  const applyHighlightColor = (color: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setCurrentHighlight(color);
    setShowHighlightPicker(false);
    if (color === 'transparent') {
      document.execCommand('removeFormat', false);
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    updateToolbarState();
    onContentChange();
  };

  // Clear Formatting
  const clearFormatting = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('removeFormat', false);
    updateToolbarState();
    onContentChange();
  };

  return (
    <div className="w-full bg-[#201811] border border-[#483726] rounded-xl p-2 sm:p-2.5 shadow-lg flex flex-wrap items-center gap-1.5 sm:gap-2 text-[#E2D4C3] select-none sticky top-2 z-20 backdrop-blur-md">
      
      {/* 1. History (Undo / Redo) */}
      <div className="flex items-center space-x-0.5 border-r border-[#483726]/80 pr-1.5 sm:pr-2">
        <button
          type="button"
          onClick={() => execCmd('undo')}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded hover:bg-[#34261B] hover:text-[#F3D4A0] text-[#B8A593] transition-colors"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCmd('redo')}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded hover:bg-[#34261B] hover:text-[#F3D4A0] text-[#B8A593] transition-colors"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Font Family Dropdown */}
      <div className="relative" ref={fontMenuRef}>
        <button
          type="button"
          onClick={() => setShowFontMenu(!showFontMenu)}
          title="Font Family"
          className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-[#18110B] border border-[#483726] hover:border-[#C49A61]/70 text-xs sm:text-sm font-medium text-[#F0E2D1] min-w-[120px] sm:min-w-[145px] transition-colors shadow-inner"
        >
          <span className="truncate">{currentFontFamily}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#B8A593] shrink-0" />
        </button>

        {showFontMenu && (
          <div className="absolute left-0 mt-1.5 w-52 bg-[#1C140D] border border-[#5A4530] rounded-lg shadow-2xl py-1.5 z-50 max-h-60 overflow-y-auto">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => applyFontFamily(f)}
                className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm flex items-center justify-between hover:bg-[#2D2115] hover:text-[#F3D4A0] transition-colors ${
                  currentFontFamily === f.name ? 'text-[#F3D4A0] bg-[#291E14] font-bold' : 'text-[#D0C0AF]'
                }`}
                style={{ fontFamily: f.font }}
              >
                <span>{f.label}</span>
                {currentFontFamily === f.name && <span className="text-[#C49A61] text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Font Size Selector */}
      <div className="relative" ref={sizeMenuRef}>
        <div className="flex items-center bg-[#18110B] border border-[#483726] rounded px-1.5 py-1">
          <input
            type="text"
            value={customSizeInput}
            onChange={(e) => setCustomSizeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const parsed = parseInt(customSizeInput, 10);
                if (!isNaN(parsed) && parsed >= 8 && parsed <= 96) {
                  applyFontSize(parsed);
                }
              }
            }}
            onBlur={() => {
              const parsed = parseInt(customSizeInput, 10);
              if (!isNaN(parsed) && parsed >= 8 && parsed <= 96) {
                applyFontSize(parsed);
              } else {
                setCustomSizeInput(currentFontSize.toString());
              }
            }}
            title="Font Size (px) - Type and press Enter"
            className="w-7 text-center bg-transparent text-xs sm:text-sm font-mono text-[#F0E2D1] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowSizeMenu(!showSizeMenu)}
            title="Select Font Size"
            className="text-[#B8A593] hover:text-[#F3D4A0] pl-1 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {showSizeMenu && (
          <div className="absolute left-0 mt-1.5 w-24 bg-[#1C140D] border border-[#5A4530] rounded-lg shadow-2xl py-1 z-50 max-h-52 overflow-y-auto">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => applyFontSize(size)}
                className={`w-full text-left px-3 py-1 text-xs font-mono flex items-center justify-between hover:bg-[#2D2115] hover:text-[#F3D4A0] transition-colors ${
                  currentFontSize === size ? 'text-[#F3D4A0] bg-[#291E14] font-bold' : 'text-[#D0C0AF]'
                }`}
              >
                <span>{size} px</span>
                {currentFontSize === size && <span className="text-[#C49A61]">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-5 w-[1px] bg-[#483726]/80 mx-0.5 hidden sm:block" />

      {/* 4. Text Formatting (Bold, Italic, Underline, Strike) */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => execCmd('bold')}
          title="Bold (Ctrl+B)"
          className={`p-1.5 rounded transition-all ${
            isBold 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('italic')}
          title="Italic (Ctrl+I)"
          className={`p-1.5 rounded transition-all ${
            isItalic 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('underline')}
          title="Underline (Ctrl+U)"
          className={`p-1.5 rounded transition-all ${
            isUnderline 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('strikeThrough')}
          title="Strikethrough"
          className={`p-1.5 rounded transition-all ${
            isStrike 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-[1px] bg-[#483726]/80 mx-0.5 hidden sm:block" />

      {/* 5. Text Color & Highlight */}
      <div className="flex items-center space-x-1">
        {/* Text Color Picker */}
        <div className="relative" ref={colorMenuRef}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Text Color"
            className="p-1.5 rounded hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0] flex flex-col items-center justify-center transition-colors"
          >
            <div className="flex items-center gap-0.5">
              <span className="font-serif font-bold text-xs sm:text-sm">A</span>
              <ChevronDown className="w-2.5 h-2.5 text-[#B8A593]" />
            </div>
            <div 
              className="w-3.5 h-1 rounded-sm mt-0.5 border border-black/40" 
              style={{ backgroundColor: currentColor }} 
            />
          </button>

          {showColorPicker && (
            <div className="absolute left-0 mt-1.5 w-44 bg-[#1C140D] border border-[#5A4530] rounded-lg shadow-2xl p-2.5 z-50">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#9E8B79] block mb-2">
                Ink Color
              </span>
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => applyTextColor(c.value)}
                    title={c.label}
                    className="w-7 h-7 rounded border border-[#5A4530] hover:scale-110 transition-transform shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: c.value }}
                  >
                    {currentColor === c.value && <span className="text-white text-xs">✓</span>}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-[#3B2C1F]">
                <input
                  type="color"
                  value={currentColor.startsWith('#') ? currentColor : '#221811'}
                  onChange={(e) => applyTextColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  title="Custom Color"
                />
                <span className="text-[11px] font-sans text-[#B09F8F]">Custom Palette</span>
              </div>
            </div>
          )}
        </div>

        {/* Highlight Color Picker */}
        <div className="relative" ref={highlightMenuRef}>
          <button
            type="button"
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            title="Highlight Color"
            className="p-1.5 rounded hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0] flex flex-col items-center justify-center transition-colors"
          >
            <div className="flex items-center gap-0.5">
              <Highlighter className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 text-[#B8A593]" />
            </div>
            <div 
              className="w-3.5 h-1 rounded-sm mt-0.5 border border-black/40" 
              style={{ backgroundColor: currentHighlight === 'transparent' ? '#5A4530' : currentHighlight }} 
            />
          </button>

          {showHighlightPicker && (
            <div className="absolute left-0 mt-1.5 w-44 bg-[#1C140D] border border-[#5A4530] rounded-lg shadow-2xl p-2.5 z-50">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#9E8B79] block mb-2">
                Highlight
              </span>
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => applyHighlightColor(h.value)}
                    title={h.label}
                    className="w-7 h-7 rounded border border-[#5A4530] hover:scale-110 transition-transform shadow-sm flex items-center justify-center text-[10px]"
                    style={{ backgroundColor: h.value === 'transparent' ? '#2A1F16' : h.value }}
                  >
                    {h.value === 'transparent' ? '✕' : (currentHighlight === h.value ? '✓' : '')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-5 w-[1px] bg-[#483726]/80 mx-0.5 hidden sm:block" />

      {/* 6. Paragraph Alignment */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => execCmd('justifyLeft')}
          title="Align Left"
          className={`p-1.5 rounded transition-all ${
            alignment === 'left' 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('justifyCenter')}
          title="Align Center"
          className={`p-1.5 rounded transition-all ${
            alignment === 'center' 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('justifyRight')}
          title="Align Right"
          className={`p-1.5 rounded transition-all ${
            alignment === 'right' 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('justifyFull')}
          title="Justify"
          className={`p-1.5 rounded transition-all ${
            alignment === 'justify' 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-[1px] bg-[#483726]/80 mx-0.5 hidden sm:block" />

      {/* 7. Lists & Indentation */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => execCmd('insertUnorderedList')}
          title="Bulleted List"
          className={`p-1.5 rounded transition-all ${
            isBulletList 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('insertOrderedList')}
          title="Numbered List"
          className={`p-1.5 rounded transition-all ${
            isOrderedList 
              ? 'bg-[#C49A61] text-[#14100D] font-bold shadow' 
              : 'hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0]'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('outdent')}
          title="Decrease Indent"
          className="p-1.5 rounded hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0] transition-colors"
        >
          <Outdent className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCmd('indent')}
          title="Increase Indent"
          className="p-1.5 rounded hover:bg-[#34261B] text-[#D0C0AF] hover:text-[#F3D4A0] transition-colors"
        >
          <Indent className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-[1px] bg-[#483726]/80 mx-0.5 hidden sm:block" />

      {/* 8. Reset / Clear Formatting */}
      <button
        type="button"
        onClick={clearFormatting}
        title="Clear Formatting"
        className="p-1.5 rounded hover:bg-[#34261B] text-[#B8A593] hover:text-[#E57373] transition-colors ml-auto"
      >
        <RemoveFormatting className="w-4 h-4" />
      </button>

    </div>
  );
};
