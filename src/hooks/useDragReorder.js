import {useCallback, useEffect, useRef, useState} from 'react';

// How long a finger must rest on the handle before a drag starts, and how far it can
// wander in that time. Inside the window the handle behaves like any other part of the
// list (the column scrolls); past it the touch belongs to the drag.
const LONG_PRESS_MS = 250;
const LONG_PRESS_SLOP_PX = 8;
const AUTOSCROLL_EDGE_PX = 48;
const AUTOSCROLL_STEP_PX = 10;

const scrollParentOf = (el) => {
    for (let node = el?.parentElement; node; node = node.parentElement) {
        const {overflowY} = getComputedStyle(node);
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    }
    return null;
};

/**
 * Drag-to-reorder for a vertical list, started from a handle.
 *
 * A mouse drags straight away; a finger needs a long press first, so scrolling past
 * the handle never picks a row up. The row follows the pointer and its neighbours
 * slide out of the way; the move is committed on release as onMove(from, to). The
 * list edges auto-scroll while dragging.
 *
 * Usage: attach `blockRef(i)` to each row, spread `handleProps(i)` on its handle, and
 * apply `blockStyle(i)` to the row. Only the rows move; anything between them (the
 * editor's rest rows) stays put.
 */
export const useDragReorder = ({onMove, enabled = true}) => {
    const [drag, setDrag] = useState(null);          // {from, to, dy} while dragging
    const blocksRef = useRef([]);
    const metricsRef = useRef(null);                 // layout measured when the drag began
    const pendingRef = useRef(null);                 // a touch waiting out its long press
    const dragRef = useRef(null);                    // mirror of `drag` for the listeners
    const pointerYRef = useRef(0);
    const rafRef = useRef(null);
    const touchMoveGuardRef = useRef(null);
    // Read through a ref so a re-render with a fresh onMove can't tear down a drag in flight.
    const onMoveRef = useRef(onMove);
    onMoveRef.current = onMove;

    const stopAutoscroll = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    };

    // Recompute where the dragged row would land for the current pointer position.
    const track = useCallback(() => {
        const m = metricsRef.current;
        const d = dragRef.current;
        if (!m || !d) return;

        const scrolled = (m.scroller ? m.scroller.scrollTop : 0) - m.startScroll;
        const dy = pointerYRef.current - m.startY + scrolled;
        const center = m.tops[d.from] + m.heights[d.from] / 2 + dy;
        let to = 0;
        m.tops.forEach((top, j) => {
            if (j !== d.from && top + m.heights[j] / 2 < center) to++;
        });
        const next = {from: d.from, to, dy};
        dragRef.current = next;
        setDrag(next);
    }, []);

    const autoscroll = useCallback(() => {
        const m = metricsRef.current;
        if (!m?.scroller || !dragRef.current) return;
        const rect = m.scroller.getBoundingClientRect();
        const y = pointerYRef.current;
        if (y < rect.top + AUTOSCROLL_EDGE_PX) m.scroller.scrollTop -= AUTOSCROLL_STEP_PX;
        else if (y > rect.bottom - AUTOSCROLL_EDGE_PX) m.scroller.scrollTop += AUTOSCROLL_STEP_PX;
        track();
        rafRef.current = requestAnimationFrame(autoscroll);
    }, [track]);

    const begin = useCallback((index, clientY) => {
        const els = blocksRef.current;
        if (!els[index]) return;
        const scroller = scrollParentOf(els[index]);
        const base = scroller ? scroller.getBoundingClientRect().top - scroller.scrollTop : 0;
        const rects = els.map(el => el.getBoundingClientRect());
        const tops = rects.map(r => r.top - base);
        const heights = rects.map(r => r.height);

        pointerYRef.current = clientY;
        metricsRef.current = {tops, heights, scroller, startY: clientY, startScroll: scroller ? scroller.scrollTop : 0};
        dragRef.current = {from: index, to: index, dy: 0};
        setDrag(dragRef.current);
        stopAutoscroll();
        rafRef.current = requestAnimationFrame(autoscroll);
    }, [autoscroll]);

    const finish = useCallback((commit) => {
        const d = dragRef.current;
        const pending = pendingRef.current;
        if (pending) clearTimeout(pending.timer);
        pendingRef.current = null;
        stopAutoscroll();
        if (touchMoveGuardRef.current) {
            window.removeEventListener('touchmove', touchMoveGuardRef.current);
            touchMoveGuardRef.current = null;
        }
        dragRef.current = null;
        metricsRef.current = null;
        setDrag(null);
        if (commit && d && d.from !== d.to) onMoveRef.current(d.from, d.to);
    }, []);

    useEffect(() => () => finish(false), [finish]);

    const handleProps = (index) => ({
        onPointerDown: (e) => {
            if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
            // Keeps move/up events coming even when the pointer leaves the handle. Not
            // essential, and some browsers throw for pointers they no longer track.
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch { /* carry on without capture */ }
            pointerYRef.current = e.clientY;

            if (e.pointerType === 'mouse') {
                begin(index, e.clientY);
                return;
            }
            // A finger: wait out the long press. Once the drag is on, stop the browser
            // from also scrolling the page under it.
            touchMoveGuardRef.current = (ev) => {
                if (dragRef.current && ev.cancelable) ev.preventDefault();
            };
            window.addEventListener('touchmove', touchMoveGuardRef.current, {passive: false});
            pendingRef.current = {
                x: e.clientX, y: e.clientY,
                timer: setTimeout(() => {
                    pendingRef.current = null;
                    navigator.vibrate?.(15);
                    begin(index, pointerYRef.current);
                }, LONG_PRESS_MS)
            };
        },
        onPointerMove: (e) => {
            pointerYRef.current = e.clientY;
            const pending = pendingRef.current;
            if (pending) {
                if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > LONG_PRESS_SLOP_PX) finish(false);
                return;
            }
            if (dragRef.current) track();
        },
        onPointerUp: () => finish(true),
        onPointerCancel: () => finish(false),
        onContextMenu: (e) => e.preventDefault(),
    });

    const blockRef = (index) => (el) => {
        blocksRef.current[index] = el;
    };

    // Style for a row's wrapper while a drag is on: the dragged row rides the pointer,
    // rows between its start and its landing slot slide one place to make room.
    const blockStyle = (index) => {
        if (!drag) return {};
        const m = metricsRef.current;
        if (index === drag.from) {
            return {transform: `translateY(${drag.dy}px)`, zIndex: 30, position: 'relative', transition: 'none'};
        }
        // Each row between the start and the landing slot slides into its neighbour's
        // place, so the offset is the distance to that place (rows needn't be the same
        // distance apart: the last step has no rest row beneath it).
        let offset = 0;
        if (m && drag.from < drag.to && index > drag.from && index <= drag.to) offset = m.tops[index - 1] - m.tops[index];
        if (m && drag.from > drag.to && index >= drag.to && index < drag.from) offset = m.tops[index + 1] - m.tops[index];
        return {transform: `translateY(${offset}px)`, transition: 'transform 150ms ease-out'};
    };

    return {dragging: drag !== null, dragFrom: drag?.from ?? null, handleProps, blockRef, blockStyle};
};
