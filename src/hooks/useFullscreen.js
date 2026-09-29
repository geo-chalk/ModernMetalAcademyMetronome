import {useCallback, useEffect, useState} from 'react';

const fullscreenElement = () =>
    document.fullscreenElement ?? document.webkitFullscreenElement ?? null;

/**
 * Browser fullscreen via the Fullscreen API — the way to lose Chrome's URL bar
 * on Android (and the window chrome on desktop) without installing the app.
 * Unsupported where the API is missing (iPhone Safari), so `supported` gates
 * the menu button. `toggle` must run from a user gesture; the browser rejects
 * it otherwise and the promise is swallowed. Nothing persists: browsers require
 * a fresh gesture on every page load.
 */
export const useFullscreen = () => {
    const supported = typeof document !== 'undefined'
        && (document.fullscreenEnabled === true || document.webkitFullscreenEnabled === true);

    const [active, setActive] = useState(() => supported && fullscreenElement() != null);

    useEffect(() => {
        if (!supported) return;
        const sync = () => setActive(fullscreenElement() != null);
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        return () => {
            document.removeEventListener('fullscreenchange', sync);
            document.removeEventListener('webkitfullscreenchange', sync);
        };
    }, [supported]);

    const toggle = useCallback(async () => {
        if (!supported) return;
        try {
            if (fullscreenElement()) {
                await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
            } else {
                const el = document.documentElement;
                await (el.requestFullscreen?.({navigationUI: 'hide'}) ?? el.webkitRequestFullscreen?.());
            }
        } catch {
            // Refused (no user gesture, iframe policy, or the user dismissed it).
        }
    }, [supported]);

    return {supported, active, toggle};
};
