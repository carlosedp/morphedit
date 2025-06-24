import { useEffect, useCallback } from 'react';
import { keyboardShortcuts, type ShortcutAction } from './keyboardShortcuts';

interface UseKeyboardShortcutsProps {
  onAction: (action: ShortcutAction) => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onAction,
  enabled = true,
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except for specific shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        // Allow Ctrl+Z or Cmd+Z for undo
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key === 'z' &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          onAction('undo');
          return;
        }
        return;
      }

      const shortcut = keyboardShortcuts[event.key];
      if (shortcut && enabled) {
        event.preventDefault();
        onAction(shortcut.action as ShortcutAction);
      }
    },
    [onAction, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return keyboardShortcuts;
};
