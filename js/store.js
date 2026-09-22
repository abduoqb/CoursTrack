import { uuid } from './utils.js';

const STORAGE_KEY = 'suivit_cours_data';
const DB_NAME = 'suivit_cours_files';
const DB_STORE = 'files';
const DB_VERSION = 1;

// ===== LocalStorage =====

function load() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : { subjects: [] };
    } catch {
        return { subjects: [] };
    }
}

function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== IndexedDB (fichiers) =====

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveFile(fileId, file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(
            { blob: file, name: file.name, type: file.type },
            fileId
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getFile(fileId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(fileId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

async function deleteFile(fileId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(fileId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ===== Store API =====

export const Store = {
    getSubjects() {
        return load().subjects;
    },

    getSubject(id) {
        return load().subjects.find(s => s.id === id) || null;
    },

    addSubject(name) {
        const data = load();
        const subject = { id: uuid(), name, categories: [] };
        data.subjects.push(subject);
        save(data);
        return subject;
    },

    deleteSubject(id) {
        const data = load();
        const subject = data.subjects.find(s => s.id === id);
        if (subject) {
            for (const cat of subject.categories) {
                for (const item of cat.items) {
                    if (item.fileId) deleteFile(item.fileId).catch(() => {});
                }
            }
        }
        data.subjects = data.subjects.filter(s => s.id !== id);
        save(data);
    },

    updateSubjectName(id, name) {
        const data = load();
        const subject = data.subjects.find(s => s.id === id);
        if (subject) {
            subject.name = name;
            save(data);
        }
    },

    addCategory(subjectId, name) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            if (subject.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                return null; // Catégorie déjà existante
            }
            const category = { name, items: [] };
            subject.categories.push(category);
            save(data);
            return category;
        }
        return null;
    },

    deleteCategory(subjectId, categoryName) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            const cat = subject.categories.find(c => c.name === categoryName);
            if (cat) {
                for (const item of cat.items) {
                    if (item.fileId) deleteFile(item.fileId).catch(() => {});
                }
            }
            subject.categories = subject.categories.filter(c => c.name !== categoryName);
            save(data);
        }
    },

    addItem(subjectId, categoryName, title) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            const category = subject.categories.find(c => c.name === categoryName);
            if (category) {
                const item = { id: uuid(), title, done: false, fileId: null };
                category.items.push(item);
                save(data);
                return item;
            }
        }
        return null;
    },

    deleteItem(subjectId, categoryName, itemId) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            const category = subject.categories.find(c => c.name === categoryName);
            if (category) {
                const item = category.items.find(i => i.id === itemId);
                if (item && item.fileId) {
                    deleteFile(item.fileId).catch(() => {});
                }
                category.items = category.items.filter(i => i.id !== itemId);
                save(data);
            }
        }
    },

    toggleItem(subjectId, categoryName, itemId) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            const category = subject.categories.find(c => c.name === categoryName);
            if (category) {
                const item = category.items.find(i => i.id === itemId);
                if (item) {
                    item.done = !item.done;
                    save(data);
                    return item.done;
                }
            }
        }
        return false;
    },

    setItemFile(subjectId, categoryName, itemId, fileId) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            const category = subject.categories.find(c => c.name === categoryName);
            if (category) {
                const item = category.items.find(i => i.id === itemId);
                if (item) {
                    if (item.fileId) deleteFile(item.fileId).catch(() => {});
                    item.fileId = fileId;
                    save(data);
                }
            }
        }
    },

    // File operations
    saveFile,
    getFile,
    deleteFile,

    // Export / Import
    exportData() {
        return JSON.stringify(load(), null, 2);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.subjects && Array.isArray(data.subjects)) {
                save(data);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }
};
