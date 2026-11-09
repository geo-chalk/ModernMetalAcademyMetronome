// The uploaded audio file, kept on the device in IndexedDB. localStorage can't
// hold a 10 MB blob, and a Blob in IndexedDB sits on disk rather than in the JS
// heap, so a stored track costs nothing until it is played. No library: the
// three calls below are all the app needs, wrapped in promises.
//
// One track at a time for now (the key is still the file's identity, so a
// library later is a listing away). The id is name|size rather than anything
// from lastModified, which changes when a file is copied between devices and
// would break the link to the tempo saved for it.

const DB_NAME = 'mma-metronome';
const DB_VERSION = 1;
const STORE = 'tracks';

export const trackId = (file) => `${file.name}|${file.size}`;

const openDb = () => new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available'));
        return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath: 'id'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const withStore = async (mode, run) => {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const result = run(tx.objectStore(STORE));
            tx.oncomplete = () => resolve(result?.result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

// Asks the browser not to evict our storage under pressure. No prompt in Chrome
// (granted by heuristics) and a no-op where unsupported; it matters most on iOS,
// where a site's data can be cleared after seven days without a visit.
const requestPersistence = () => {
    try {
        navigator.storage?.persist?.().catch(() => {});
    } catch {
        // Not available: nothing to do.
    }
};

export const putTrack = async (file) => {
    const id = trackId(file);
    requestPersistence();
    await withStore('readwrite', (store) => store.put({
        id, name: file.name, type: file.type, size: file.size, blob: file, addedAt: Date.now()
    }));
    return id;
};

// Resolves to the record, or null when it is gone (never stored on this device,
// or evicted since).
export const getTrack = async (id) => {
    const rec = await withStore('readonly', (store) => store.get(id));
    return rec ?? null;
};

export const deleteTrack = (id) => withStore('readwrite', (store) => store.delete(id));
