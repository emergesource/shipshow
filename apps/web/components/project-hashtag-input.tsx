"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface Project {
  id: string;
  name: string;
}

interface ProjectHashtagInputProps {
  defaultValue?: string;
  defaultProjectId?: string;
  projects: Project[];
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function ProjectHashtagInput({
  defaultValue = "",
  defaultProjectId,
  projects,
  placeholder,
  rows = 12,
  required = false,
  disabled = false,
  autoFocus = false,
  onKeyDown
}: ProjectHashtagInputProps) {
  const [content, setContent] = useState(defaultValue);
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [suggestions, setSuggestions] = useState<Project[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editableRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Set initial content and focus
  useEffect(() => {
    if (editableRef.current && defaultValue) {
      editableRef.current.textContent = defaultValue;
    }
    if (autoFocus && editableRef.current) {
      editableRef.current.focus();
    }
  }, [defaultValue, autoFocus]);

  // Get current cursor position
  function getCursorPosition(): number {
    const selection = window.getSelection();
    if (!selection || !editableRef.current) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editableRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  // Set cursor position
  function setCursorPosition(position: number) {
    if (!editableRef.current) return;

    const textNode = editableRef.current.firstChild;
    if (!textNode) return;

    const range = document.createRange();
    const selection = window.getSelection();

    try {
      range.setStart(textNode, Math.min(position, textNode.textContent?.length || 0));
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (e) {
      // Ignore errors from invalid positions
    }
  }

  // Update project ID when hashtag is detected
  function updateProjectFromHashtag(text: string) {
    const hashtagMatch = text.match(/#(\w+)/);
    if (hashtagMatch) {
      const hashtagText = hashtagMatch[1].toLowerCase();
      const matchedProject = projects.find(
        p => p.name.toLowerCase().replace(/\s+/g, '') === hashtagText
      );
      if (matchedProject) {
        setProjectId(matchedProject.id);
      }
    }
  }

  // Highlight hashtags in text
  function highlightHashtags(text: string): string {
    return text.replace(
      /#(\w+)/g,
      '<span class="text-primary font-semibold">#$1</span>'
    );
  }

  // Handle text input
  function handleInput() {
    if (!editableRef.current) return;

    const newContent = editableRef.current.textContent || "";
    const cursorPos = getCursorPosition();

    setContent(newContent);
    updateProjectFromHashtag(newContent);

    // Find the word at cursor that starts with #
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('#') && currentWord.length > 1) {
      const search = currentWord.substring(1).toLowerCase();
      const filtered = projects.filter(p =>
        p.name.toLowerCase().replace(/\s+/g, '').includes(search)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }

    // Apply highlighting only if not currently typing a hashtag
    if (!currentWord.startsWith('#')) {
      const highlighted = highlightHashtags(newContent);
      const currentHTML = editableRef.current.innerHTML;

      // Only update if different (avoids unnecessary cursor jumps)
      if (currentHTML !== highlighted && !highlighted.includes('<')) {
        // Plain text, no change needed
      } else if (currentHTML !== highlighted) {
        editableRef.current.innerHTML = highlighted;
        setCursorPosition(cursorPos);
      }
    }
  }

  // Handle paste to ensure plain text only
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  // Handle keyboard navigation in suggestions
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        selectProject(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }

    // Call parent onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  }

  // Insert selected project as hashtag
  function selectProject(project: Project) {
    if (!editableRef.current) return;

    const cursorPos = getCursorPosition();
    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);

    // Find the hashtag being typed
    const words = textBeforeCursor.split(/\s/);
    const lastWordStart = textBeforeCursor.lastIndexOf(words[words.length - 1]);

    // Replace with project hashtag
    const projectHashtag = `#${project.name.replace(/\s+/g, '')}`;
    const newContent =
      content.substring(0, lastWordStart) +
      projectHashtag +
      ' ' +
      textAfterCursor;

    setContent(newContent);
    setProjectId(project.id);
    setShowSuggestions(false);

    // Update content and cursor
    editableRef.current.innerHTML = highlightHashtags(newContent);
    const newPosition = lastWordStart + projectHashtag.length + 1;

    setTimeout(() => {
      setCursorPosition(newPosition);
      editableRef.current?.focus();
    }, 0);
  }

  return (
    <div className="relative">
      <div
        ref={editableRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        className="w-full p-4 rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent overflow-y-auto whitespace-pre-wrap break-words"
        style={{
          minHeight: `${rows * 1.5}rem`,
          maxHeight: `${rows * 1.5}rem`,
        }}
      />

      {/* Show placeholder when empty */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
      `}</style>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="project_id" value={projectId} />

      {/* Autocomplete suggestions */}
      {showSuggestions && (
        <Card
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto"
        >
          <div className="py-1">
            {suggestions.map((project, index) => (
              <button
                key={project.id}
                type="button"
                onClick={() => selectProject(project)}
                className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-accent transition-colors ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
              >
                <span className="text-primary">#</span>
                {project.name.replace(/\s+/g, '')}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-2">
        Type <span className="font-mono text-primary">#projectname</span> to assign to a project
      </p>
    </div>
  );
}
