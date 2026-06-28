import { useState, useRef, useEffect } from 'react';

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick();
    setIsOpen(false);
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
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle dropdown"
        className={`${baseClasses} px-2 py-2 rounded-r-md border-l border-white/20 dark:border-black/20 transition-colors`}
      >
        <svg
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
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
        <div className="absolute z-10 mt-2 top-full left-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {items.map((item, index) => (
              <div key={index} title={item.disabled ? item.tooltip : undefined}>
                <button
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
