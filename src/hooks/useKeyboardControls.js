import {useEffect, useRef} from 'react';

const isTypingTarget = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable === true;
};

/**
 * The app's single window-level keydown listener.
 *
 * @param onSpace  Space — start / stop.
 * @param onTap    T — tap tempo. `T` rather than a modifier: a modifier's
 *                 keydown fires *before* the key it modifies, so Shift+Tab or
 *                 Shift+Arrow would each inject a phantom tap, and deferring to
 *                 keyup to disambiguate would fold the whole press duration into
 *                 the rhythmic measurement. `T` is also the DAW convention.
 */
export const useKeyboardControls = ({onSpace, onTap} = {}) => {
    // Handlers behind a ref so the listener binds exactly once. The previous
    // version listed onSpace as a dependency; because useMetronome's start/stop
    // aren't memoized, handleStop -> toggleMetronome changed identity on every
    // render and the listener was torn down and re-added every render.
    const handlersRef = useRef({onSpace, onTap});
    useEffect(() => {
        handlersRef.current = {onSpace, onTap};
    }, [onSpace, onTap]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.isComposing) return;

            // Never steal a key from a field the user is typing in. activeElement
            // is checked as well as target because an open <select> dropdown can
            // retarget the event to the document.
            //
            // This also fixes an existing bug: Space used to start/stop the
            // metronome while a <select> (Count-in, time signature) had focus,
            // instead of opening its dropdown.
            if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) return;

            const {onSpace, onTap} = handlersRef.current;

            if (event.code === 'Space') {
                if (event.repeat) return;   // holding Space isn't start/stop/start/...
                if (event.ctrlKey || event.metaKey || event.altKey) return;
                event.preventDefault();     // page scroll, and re-activating a focused button
                onSpace?.();
                return;
            }

            // Tap tempo. Match the mnemonic (event.key, i.e. the printed cap) and
            // the physical position (event.code) so both layouts are covered;
            // toLowerCase also lets Shift+T through.
            const isTapKey = event.key?.toLowerCase() === 't' || event.code === 'KeyT';
            if (isTapKey && onTap) {
                if (event.repeat) return;   // auto-repeat would inject ~30 phantom taps/sec
                if (event.ctrlKey || event.metaKey || event.altKey) return; // leave Cmd/Ctrl+T alone
                event.preventDefault();
                onTap(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
};
