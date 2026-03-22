import { useState, useEffect, useCallback } from 'react';

/**
 * A drop-in replacement for useState that persists the value in localStorage.
 * Data survives tab close and browser restart.
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch {
            // localStorage full or unavailable — silently ignore
        }
    }, [key, storedValue]);

    const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
        (value) => {
            setStoredValue((prev) => {
                const next = value instanceof Function ? value(prev) : value;
                return next;
            });
        },
        [],
    );

    return [storedValue, setValue];
}
