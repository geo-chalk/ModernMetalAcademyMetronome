import React, {useCallback, useState} from 'react';
import PresetBar from '../PresetBar';
import LockFinalButton from '../LockFinalButton';
import TrackFilePicker from './TrackFilePicker';
import TrackTempoInput from './TrackTempoInput';
import TrackRangeControls from './TrackRangeControls';
import TrackRangeDisplay from './TrackRangeDisplay';
import {usePresets} from '../../hooks/usePresets';
import {useBpmDetection} from '../../hooks/useBpmDetection';
import {TRACK_PRESETS} from '../../constants/track';

/**
 * The right-hand column of Track mode: the file, its tempo, and the speed
 * ladder. Mirrors the Trainer's drill column in App.jsx; the state lives in
 * useTrackSettings / useTrackLibrary and is handed in whole.
 */
const TrackPanel = ({settings, library, locked}) => {
    const {
        unit, setUnit, range, rates, restSeconds, setRestSeconds, lockFinal, setLockFinal,
        track, originalBpm, setOriginalBpm, presetState, applyPreset
    } = settings;
    const {status, duration, message, addFile, removeTrack, getBlob} = library;

    // Tempo from the file itself; reset whenever the file changes.
    const detection = useBpmDetection({getBlob, trackId: settings.currentId});

    // Track presets: the drill under a name, same machinery as the Trainer's.
    const {presets, save, load, remove, isFull} = usePresets(TRACK_PRESETS);
    const [selectedId, setSelectedId] = useState('');

    const handleSelect = useCallback((id) => {
        setSelectedId(id);
        if (!id) return;
        const p = load(id);
        if (!p) {
            setSelectedId('');
            return;
        }
        applyPreset(p);
    }, [load, applyPreset]);

    const handleSave = useCallback((name) => {
        const saved = save(name, presetState);
        if (saved) setSelectedId(saved.id);
    }, [save, presetState]);

    const handleDelete = useCallback((id) => {
        remove(id);
        setSelectedId(prev => (prev === id ? '' : prev));
    }, [remove]);

    return (
        <div className={`flex flex-col gap-1 ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
            <TrackFilePicker status={status} track={track} duration={duration} message={message}
                             onPick={addFile} onRemove={removeTrack} disabled={locked}/>

            <TrackTempoInput originalBpm={originalBpm} setOriginalBpm={setOriginalBpm}
                             bpmSource={track?.bpmSource} disabled={locked} hasTrack={!!track}
                             detection={detection} canDetect={status === 'ready'}/>

            <div className="pt-3 border-t border-white/5">
                <PresetBar presets={presets} selectedId={selectedId} onSelect={handleSelect}
                           onSave={handleSave} onDelete={handleDelete} isFull={isFull} disabled={locked}/>

                <TrackRangeControls unit={unit} setUnit={setUnit} range={range} originalBpm={originalBpm}
                                    restSeconds={restSeconds} setRestSeconds={setRestSeconds}/>
            </div>

            <div className="mt-6 short:mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <TrackRangeDisplay rates={rates} originalBpm={originalBpm} duration={duration}
                                   restSeconds={restSeconds} lockFinal={lockFinal}/>
                <LockFinalButton locked={lockFinal} onToggle={() => setLockFinal(!lockFinal)} disabled={locked}
                                 label="Lock final speed" lockedLabel="Locked"/>
            </div>
        </div>
    );
};

export default TrackPanel;
