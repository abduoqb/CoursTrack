import { uuid } from './utils.js?v=3';

const STORAGE_KEY = 'suivit_cours_data';
const DB_NAME = 'suivit_cours_files';
const DB_STORE = 'files';
const DB_VERSION = 1;

// ===== LocalStorage =====

function load() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const parsed = data ? JSON.parse(data) : { subjects: [] };
        // Migrate old examDate → exams[]
        let migrated = false;
        for (const s of parsed.subjects) {
            if (!s.exams) s.exams = [];
            if (s.examDate) {
                s.exams.push({ id: uuid(), name: 'Examen', date: s.examDate, checklist: [] });
                delete s.examDate;
                migrated = true;
            }
        }
        if (migrated) save(parsed);
        return parsed;
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

    setExamDate(id, dateStr) {
        // Legacy compat — kept for potential old callers
        const data = load();
        const subject = data.subjects.find(s => s.id === id);
        if (subject) {
            subject.examDate = dateStr || null;
            save(data);
        }
    },

    // ===== Multi-Exam API =====

    addExam(subjectId, name, dateStr) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject) {
            if (!subject.exams) subject.exams = [];
            const exam = { id: uuid(), name, date: dateStr, checklist: [] };
            subject.exams.push(exam);
            save(data);
            return exam;
        }
        return null;
    },

    updateExam(subjectId, examId, updates) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject && subject.exams) {
            const exam = subject.exams.find(e => e.id === examId);
            if (exam) {
                if (updates.name !== undefined) exam.name = updates.name;
                if (updates.date !== undefined) exam.date = updates.date;
                save(data);
            }
        }
    },

    deleteExam(subjectId, examId) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject && subject.exams) {
            subject.exams = subject.exams.filter(e => e.id !== examId);
            save(data);
        }
    },

    addChecklistItem(subjectId, examId, text) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject && subject.exams) {
            const exam = subject.exams.find(e => e.id === examId);
            if (exam) {
                const item = { id: uuid(), text, done: false };
                exam.checklist.push(item);
                save(data);
                return item;
            }
        }
        return null;
    },

    toggleChecklistItem(subjectId, examId, itemId) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject && subject.exams) {
            const exam = subject.exams.find(e => e.id === examId);
            if (exam) {
                const item = exam.checklist.find(i => i.id === itemId);
                if (item) {
                    item.done = !item.done;
                    save(data);
                    return item.done;
                }
            }
        }
        return false;
    },

    deleteChecklistItem(subjectId, examId, itemId) {
        const data = load();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (subject && subject.exams) {
            const exam = subject.exams.find(e => e.id === examId);
            if (exam) {
                exam.checklist = exam.checklist.filter(i => i.id !== itemId);
                save(data);
            }
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

    // Bulk file helpers (for ZIP export/import)
    async getAllFiles() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const results = {};
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    results[cursor.key] = cursor.value;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            req.onerror = () => reject(req.error);
        });
    },

    async clearAllFiles() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    // Export / Import (metadata only — ZIP logic lives in app.js)
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
