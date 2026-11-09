import {useCallback, useEffect, useRef, useState} from 'react';
import {deleteTrack, getTrack, putTrack, trackId} from '../storage/trackStore';
import {MAX_TRACK_BYTES} from '../constants/track';

// The one audio element Track mode plays through, and the file behind it.
//
// Owns the <audio> element (created on first use, never mounted — it only has to
// exist) and keeps its `src` pointing at the current track's Blob from IndexedDB.
// Playback is useTrackTrainer's job; this hook only answers "is there a file,
// and is it ready to play?":
//
//   empty    no track chosen
//   loading  reading the blob / waiting for the element's metadata
//   ready    duration known, play() will work
//   missing  the settings remember a track but its file is gone from this
//            device (storage evicted, or settings copied); re-pick the same file
//   error    the browser can't play this file
//
// `message` carries the one-line explanation for the last two, and for a file
// that was refused before it was stored.

const UNSUPPORTED = "This file can't be played here. MP3, WAV and M4A/AAC work everywhere; OGG doesn't on Safari.";

export const useTrackLibrary = ({currentId, setCurrentId, track, rememberTrack, forgetTrack}) => {
    const audioRef = useRef(null);
    const urlRef = useRef(null);
    const blobRef = useRef(null);      // the file itself, for BPM detection
    const [status, setStatus] = useState(currentId ? 'loading' : 'empty');
    const [duration, setDuration] = useState(Number.isFinite(track?.duration) ? track.duration : 0);
    const [message, setMessage] = useState(null);

    // Callbacks and the remembered metadata behind a ref, so the load effect
    // depends on the id alone.
    const callbacksRef = useRef({rememberTrack, forgetTrack, setCurrentId, track});
    useEffect(() => {
        callbacksRef.current = {rememberTrack, forgetTrack, setCurrentId, track};
    }, [rememberTrack, forgetTrack, setCurrentId, track]);

    const getAudio = useCallback(() => {
        if (!audioRef.current && typeof Audio !== 'undefined') {
            const a = new Audio();
            a.preload = 'metadata';
            a.preservesPitch = true;   // the default everywhere now; set for clarity
            a.playsInline = true;
            audioRef.current = a;
        }
        return audioRef.current;
    }, []);

    const clearSrc = useCallback(() => {
        const a = audioRef.current;
        if (a) {
            a.pause();
            a.removeAttribute('src');
            a.load();
        }
        if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
        }
        blobRef.current = null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        let detach = null;

        if (!currentId) {
            clearSrc();
            setStatus('empty');
            setDuration(0);
            return undefined;
        }

        setStatus('loading');
        setMessage(null);
        // The remembered length (if any) stands in until the element reports its
        // own; a missing file keeps it, a new file starts from nothing.
        const remembered = callbacksRef.current.track?.duration;
        setDuration(Number.isFinite(remembered) ? remembered : 0);
        getTrack(currentId).then(rec => {
            if (cancelled) return;
            if (!rec) {
                clearSrc();
                setStatus('missing');
                return;
            }
            const audio = getAudio();
            clearSrc();
            const url = URL.createObjectURL(rec.blob);
            urlRef.current = url;
            blobRef.current = rec.blob;

            // Chrome first reports an estimate for a VBR MP3 and corrects it later
            // (durationchange), so the length is read from both events.
            const onDuration = () => {
                if (cancelled || !Number.isFinite(audio.duration)) return;
                setDuration(audio.duration);
                setStatus('ready');
                callbacksRef.current.rememberTrack(currentId, {duration: audio.duration});
            };
            const onError = () => {
                if (cancelled) return;
                const code = audio.error?.code;
                setMessage(code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || code === MediaError.MEDIA_ERR_DECODE
                    ? UNSUPPORTED : 'The file could not be loaded.');
                setStatus('error');
            };
            audio.addEventListener('loadedmetadata', onDuration);
            audio.addEventListener('durationchange', onDuration);
            audio.addEventListener('error', onError);
            detach = () => {
                audio.removeEventListener('loadedmetadata', onDuration);
                audio.removeEventListener('durationchange', onDuration);
                audio.removeEventListener('error', onError);
            };
            audio.src = url;
        }).catch(() => {
            if (cancelled) return;
            setMessage('Storage is not available in this browser, so the track could not be read.');
            setStatus('error');
        });

        return () => {
            cancelled = true;
            detach?.();
        };
    }, [currentId, clearSrc, getAudio]);

    // Release the element and its URL with the app.
    useEffect(() => () => clearSrc(), [clearSrc]);

    // A picked file replaces the current track (one track at a time): the old
    // blob goes, its metadata stays, so the same file picked again later — or
    // the very file a 'missing' entry remembers — comes back with its tempo.
    const addFile = useCallback(async (file) => {
        if (!file) return;
        if (file.size > MAX_TRACK_BYTES) {
            setMessage(`That file is ${Math.round(file.size / 1024 / 1024)} MB; the limit is ${MAX_TRACK_BYTES / 1024 / 1024} MB.`);
            return;
        }
        const id = trackId(file);
        try {
            await putTrack(file);
        } catch {
            setMessage('The file could not be saved on this device.');
            return;
        }
        const {rememberTrack: remember, setCurrentId: setCurrent} = callbacksRef.current;
        if (currentId && currentId !== id) deleteTrack(currentId).catch(() => {});
        remember(id, {name: file.name, size: file.size, type: file.type});
        setMessage(null);
        setCurrent(id);
    }, [currentId]);

    const removeTrack = useCallback(() => {
        if (!currentId) return;
        deleteTrack(currentId).catch(() => {});
        callbacksRef.current.forgetTrack(currentId);
        callbacksRef.current.setCurrentId(null);
        setMessage(null);
    }, [currentId]);

    const getBlob = useCallback(() => blobRef.current, []);

    return {audioRef, status, duration, message, addFile, removeTrack, getBlob};
};
