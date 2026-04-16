import { memo, useEffect, useRef, useState } from 'react';

type EditableCellProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  onNavigate?: (direction: -1 | 1) => void;
  cellKey?: string;
};

const EditableCell = ({
  value,
  onChange,
  className,
  inputClassName,
  onNavigate,
  cellKey,
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = () => {
    const next = draft.trim();
    if (next !== value) {
      onChange(next);
    }
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        data-editable-cell={cellKey}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
            return;
          }

          if (event.key === 'Tab') {
            event.preventDefault();
            commit();
            onNavigate?.(event.shiftKey ? -1 : 1);
          }
        }}
        className={inputClassName ?? 'h-8 w-full rounded border border-blue-300 px-2 text-xs outline-none ring-2 ring-blue-200'}
      />
    );
  }

  return (
    <button
      type="button"
      data-editable-cell={cellKey}
      onClick={() => setIsEditing(true)}
      className={className ?? 'h-8 w-full rounded px-2 text-left text-xs text-slate-700 hover:bg-slate-100'}
      title="Click to edit"
    >
      {value || <span className="text-slate-400">-</span>}
    </button>
  );
};

export default memo(EditableCell);
