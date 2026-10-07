import {useEffect, useRef} from 'react';
import {BPM_STEP_FINE, BPM_STEP_LARGE, BPM_STEP_SMALL} from '../constants/bpm';

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
 * @param onNudge  Arrows — called with a BPM delta. Left/Right step by
 *                 BPM_STEP_SMALL, Up/Down by BPM_STEP_LARGE, matching the
 *                 slider's -20/-5/+5/+20 quick-jump buttons; Shift+Left/Right
 *                 drops to BPM_STEP_FINE.
 * @param onSnap   R — round the BPM onto the BPM_STEP_SMALL grid.
 * @param onToggleAccents
 *                 A — flip the accent switch. Bare `A` is safe: Cmd/Ctrl+A is
 *                 already returned above, so select-all still works.
 * @param onToggleMute
 *                 M — switch Mute bars on / off.
 */
export const useKeyboardControls = ({onSpace, onTap, onNudge, onSnap, onToggleAccents, onToggleMute} = {}) => {
    // Handlers behind a ref so the listener binds exactly once. The previous
    // version listed onSpace as a dependency; because useMetronome's start/stop
    // aren't memoized, handleStop -> toggleMetronome changed identity on every
    // render and the listener was torn down and re-added every render. The BPM
    // handlers close over the current tempo, so they change every nudge — all
    // the more reason to keep them out of the listener's dependencies.
    const handlersRef = useRef({onSpace, onTap, onNudge, onSnap, onToggleAccents, onToggleMute});
    useEffect(() => {
        handlersRef.current = {onSpace, onTap, onNudge, onSnap, onToggleAccents, onToggleMute};
    }, [onSpace, onTap, onNudge, onSnap, onToggleAccents, onToggleMute]);

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

            const {onSpace, onTap, onNudge, onSnap, onToggleAccents, onToggleMute} = handlersRef.current;

            // Ctrl, Cmd and Alt always belong to the browser or the OS (Cmd+R
            // reload, Cmd+T new tab, Alt+Arrow history, Ctrl+Arrow Mission Control
            // on macOS), so they're never ours. Shift is deliberately absent: it's
            // the fine-nudge modifier below, and on the rest of the shortcuts it
            // just lets the shifted character through.
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.code === 'Space') {
                if (event.repeat) return;   // holding Space isn't start/stop/start/...
                event.preventDefault();     // page scroll, and re-activating a focused button
                onSpace?.();
                return;
            }

            // Arrow nudges. Auto-repeat is deliberately allowed here — holding an
            // arrow to ramp the tempo is the point, and it's no heavier than
            // dragging the slider, which already fires the setter every pointermove.
            //
            // Shift narrows Left/Right to a single BPM, for landing on a tempo off
            // the 5 BPM grid. Shift rather than Ctrl or Alt because it's the only
            // modifier actually free: Ctrl+Arrow is macOS's move-a-space binding and
            // never reaches the page, Alt+Arrow is browser history on Windows and
            // Linux, Cmd+Arrow is browser history on macOS. Up/Down keep ±20 either
            // way — a fine step only makes sense against the small one.
            const fine = event.shiftKey;
            const nudge = {
                ArrowRight: fine ? BPM_STEP_FINE : BPM_STEP_SMALL,
                ArrowLeft: fine ? -BPM_STEP_FINE : -BPM_STEP_SMALL,
                ArrowUp: BPM_STEP_LARGE, ArrowDown: -BPM_STEP_LARGE
            }[event.key];
            if (nudge !== undefined && onNudge) {
                event.preventDefault();     // arrows would otherwise scroll the settings column
                onNudge(nudge);
                return;
            }

            // Mnemonic keys: match event.key (the printed cap) and event.code (the
            // physical position) so both layouts are covered; toLowerCase also lets
            // the shifted character through.
            const isKey = (letter, code) =>
                event.key?.toLowerCase() === letter || event.code === code;

            if (isKey('t', 'KeyT') && onTap) {
                if (event.repeat) return;   // auto-repeat would inject ~30 phantom taps/sec
                event.preventDefault();
                onTap(event);
                return;
            }

            if (isKey('r', 'KeyR') && onSnap) {
                if (event.repeat) return;   // snapping is idempotent; repeating is just churn
                event.preventDefault();
                onSnap();
                return;
            }

            if (isKey('a', 'KeyA') && onToggleAccents) {
                if (event.repeat) return;   // holding A would strobe the switch on/off
                event.preventDefault();
                onToggleAccents();
                return;
            }

            if (isKey('m', 'KeyM') && onToggleMute) {
                if (event.repeat) return;   // holding M would strobe muting on/off
                event.preventDefault();
                onToggleMute();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
};
