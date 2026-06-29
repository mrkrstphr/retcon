import { useState, useRef, useEffect, useCallback } from 'react';

export type DropdownItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
};

export type SplitButtonDropdownProps = {
  primaryLabel: string;
  primaryOnClick: () => void;
  items: DropdownItem[];
  variant?: 'primary' | 'secondary';
};

export function SplitButtonDropdown({
  primaryLabel,
  primaryOnClick,
  items,
  variant = 'primary',
}: SplitButtonDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  const focusItem = (index: number) => {
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    buttons?.[index]?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, close]);

  // Focus first item when menu opens via keyboard
  const openAndFocus = (fromEnd = false) => {
    setIsOpen(true);
    // defer focus until menu renders
    requestAnimationFrame(() => {
      const buttons =
        menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
      if (buttons?.length) {
        buttons[fromEnd ? buttons.length - 1 : 0].focus();
      }
    });
  };

  const handleToggleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      openAndFocus(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAndFocus(true);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [],
    );
    const focused = document.activeElement as HTMLButtonElement;
    const currentIndex = buttons.indexOf(focused);

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      toggleButtonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (currentIndex + 1) % buttons.length;
      focusItem(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (currentIndex - 1 + buttons.length) % buttons.length;
      focusItem(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(buttons.length - 1);
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick();
    close();
  };

  const baseClasses =
    variant === 'primary'
      ? 'bg-orange-600 hover:bg-orange-700 text-white'
      : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100';

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      {/* Primary Action Button */}
      <button
        onClick={primaryOnClick}
        className={`${baseClasses} px-4 py-2 rounded-l-md font-medium transition-colors text-sm`}
      >
        {primaryLabel}
      </button>

      {/* Dropdown Toggle Button */}
      <button
        ref={toggleButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleToggleKeyDown}
        aria-label="Toggle dropdown"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`${baseClasses} px-2 py-2 rounded-r-md border-l border-white/20 dark:border-black/20 transition-colors`}
      >
        <svg
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute z-10 mt-2 top-full left-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5"
        >
          <div className="py-1">
            {items.map((item, index) => (
              <div key={index} title={item.disabled ? item.tooltip : undefined}>
                <button
                  role="menuitem"
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    item.disabled
                      ? 'text-gray-400 dark:text-gray-600 pointer-events-none'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
