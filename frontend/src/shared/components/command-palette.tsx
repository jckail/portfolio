import React, { useEffect, useMemo, useRef, useState } from 'react';

import { openDoodle } from '../utils/open-doodle';
import { scrollToSection } from '../utils/scroll-utils';
import { setQueryParam } from '../utils/url-params';
import { useChatAvailable } from '../hooks/use-chat-available';
import { DialogShell } from './dialog-shell';
import '../../styles/components/command-palette.css';

interface Command {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function buildCommands(onClose: () => void): Command[] {
  const go = (section: string) => () => {
    scrollToSection(section);
    onClose();
  };
  const openParam = (key: string, value: string, section?: string) => () => {
    if (section) scrollToSection(section);
    setQueryParam(key, value);
    window.dispatchEvent(new PopStateEvent('popstate'));
    onClose();
  };

  return [
    { id: 'about', label: 'Go to About', hint: 'g a', keywords: 'tldr bio', run: go('about') },
    { id: 'experience', label: 'Go to Experience', hint: 'g e', keywords: 'work jobs meta', run: go('experience') },
    { id: 'projects', label: 'Go to Projects', hint: 'g p', keywords: 'github portfolio', run: go('projects') },
    { id: 'skills', label: 'Go to Skills', hint: 'g s', keywords: 'tech stack', run: go('skills') },
    { id: 'resume', label: 'Go to Resume', hint: 'g r', keywords: 'pdf cv', run: go('resume') },
    {
      id: 'doodle',
      label: 'Open doodle board',
      keywords: 'draw party easter',
      run: () => {
        openDoodle();
        onClose();
      },
    },
    {
      id: 'chat',
      label: 'Open AI assistant',
      hint: '?',
      keywords: 'chat ai assistant claude bot help',
      run: openParam('ai_chat', 'open'),
    },
    {
      id: 'contact',
      label: 'Open contact form',
      keywords: 'email message hire',
      run: openParam('contact', 'open'),
    },
    {
      id: 'download-resume',
      label: 'Download resume PDF',
      keywords: 'cv pdf',
      run: () => {
        const link = document.createElement('a');
        link.href = '/api/resume?download=1';
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
      },
    },
    {
      id: 'party',
      label: 'Start party mode 🎉',
      keywords: 'konami fun theme',
      run: () => {
        setQueryParam('theme', 'party', { replace: true });
        window.dispatchEvent(new CustomEvent('portfolio:party'));
        onClose();
      },
    },
  ];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const chatAvailable = useChatAvailable();
  const commands = useMemo(
    () => buildCommands(onClose).filter(cmd => chatAvailable || cmd.id !== 'chat'),
    [onClose, chatAvailable]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(cmd => {
      const hay = `${cmd.label} ${cmd.keywords ?? ''} ${cmd.hint ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commands, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
      return;
    }
    // Focus after paint
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const activeId = filtered[active] ? `command-option-${filtered[active].id}` : undefined;

  useEffect(() => {
    if (open && activeId) {
      document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [open, activeId]);

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(i => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      filtered[active]?.run();
    }
  };

  return (
    <DialogShell
      overlayClassName="command-palette-overlay"
      className="command-palette"
      ariaLabel="Command palette"
      onClose={onClose}
    >
      <input
        ref={inputRef}
        className="command-palette-input"
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-activedescendant={activeId}
        id="command-palette-search"
        name="command-palette-search"
        aria-label="Search commands"
        autoComplete="off"
        placeholder={
          chatAvailable
            ? 'Jump to a section, open chat, download resume…'
            : 'Jump to a section, download resume…'
        }
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-controls="command-palette-list"
      />
      <ul id="command-palette-list" className="command-palette-list" role="listbox">
        {filtered.length === 0 && (
          <li role="presentation" className="command-palette-empty">No matches</li>
        )}
        {filtered.map((cmd, index) => (
          <li key={cmd.id} role="presentation">
            <button
              type="button"
              role="option"
              id={`command-option-${cmd.id}`}
              aria-selected={index === active}
              tabIndex={-1}
              className={`command-palette-item${index === active ? ' is-active' : ''}`}
              onClick={cmd.run}
              onMouseEnter={() => setActive(index)}
            >
              <span>{cmd.label}</span>
              {cmd.hint && <kbd>{cmd.hint}</kbd>}
            </button>
          </li>
        ))}
      </ul>
      <p className="command-palette-footer">
        <kbd>↑↓</kbd> navigate · <kbd>Enter</kbd> run · <kbd>Esc</kbd> close
      </p>
    </DialogShell>
  );
};

export default CommandPalette;
