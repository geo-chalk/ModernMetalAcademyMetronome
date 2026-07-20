import {useEffect, useRef} from 'react';

/**
 * Keeps the screen awake while `active` is true, using the Screen Wake Lock API.
 * No permission prompt is involved; it only needs a secure context (HTTPS/localhost)
 * and a visible page. The OS releases the lock when the tab is hidden, so we
 * re-acquire it on visibilitychange while still active. Unsupported browsers no-op.
 */
export const useWakeLock = (active) => {
    const lockRef = useRef(null);

    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return;

        let cancelled = false;

        const request = async () => {
            try {
                lockRef.current = await navigator.wakeLock.request('screen');
            } catch {
                // Denied (page not visible, low battery, etc.) — safe to ignore.
            }
        };

        request();

        // A hidden tab auto-releases the lock; grab it again when we return.
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !cancelled) request();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibility);
            if (lockRef.current) {
                lockRef.current.release().catch(() => {});
                lockRef.current = null;
            }
        };
    }, [active]);
};
