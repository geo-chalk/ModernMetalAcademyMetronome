import { useState, useEffect } from 'react';

// `restore` (optional) maps the stored value to the one to start from, for a
// key whose live value shouldn't always come back as-is on the next visit.
export function useLocalStorage(key, defaultValue, restore = v => v) {
    const [value, setValue] = useState(() => {
        try {
            const saved = localStorage.getItem(key);
            return saved !== null ? restore(JSON.parse(saved)) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue];
}