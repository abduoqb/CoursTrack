import { Store } from './store.js';
import { renderDashboard } from './dashboard.js';
import { renderSubject } from './subject.js';
import { toast } from './utils.js';

// ===== Router =====

function route() {
    const hash = window.location.hash || '#/';

    if (hash === '#/' || hash === '' || hash === '#') {
        renderDashboard();
    } else if (hash.startsWith('#/subject/')) {
        const id = hash.replace('#/subject/', '');
        renderSubject(id);
    } else {
        renderDashboard();
    }
}

// ===== Sanitize folder/file names =====

function sanitizeName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'sans-nom';
}

// ===== ZIP Export =====

async function exportZip() {
    const zip = new JSZip();
    const subjects = Store.getSubjects();
    const allFiles = await Store.getAllFiles();

    // Build a fileId → path map so we can enrich data.json
    const fileMap = {}; // fileId → { path, name }

    for (const subject of subjects) {
        const subjectFolder = sanitizeName(subject.name);
        for (const cat of subject.categories) {
            const catFolder = sanitizeName(cat.name);
            for (const item of cat.items) {
                if (item.fileId && allFiles[item.fileId]) {
                    const fileData = allFiles[item.fileId];
                    const fileName = fileData.name || `${item.id}.bin`;
                    const filePath = `${subjectFolder}/${catFolder}/${fileName}`;

                    // Store the blob in the ZIP
                    zip.file(filePath, fileData.blob);

                    // Keep track for data.json
                    fileMap[item.fileId] = { path: filePath, name: fileName };
                }
            }
        }
    }

    // Enrich metadata: add fileName to each item that has a file
    const exportData = JSON.parse(JSON.stringify({ subjects }));
    for (const subject of exportData.subjects) {
        for (const cat of subject.categories) {
            for (const item of cat.items) {
                if (item.fileId && fileMap[item.fileId]) {
                    item.fileName = fileMap[item.fileId].name;
                    item.filePath = fileMap[item.fileId].path;
                }
            }
        }
    }

    zip.file('data.json', JSON.stringify(exportData, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courstrack_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Données exportées (ZIP)');
}

// ===== ZIP Import =====

async function importZip(file) {
    try {
        const zip = await JSZip.loadAsync(file);

        // Read data.json
        const dataFile = zip.file('data.json');
        if (!dataFile) {
            toast('ZIP invalide : data.json manquant');
            return;
        }

        const jsonStr = await dataFile.async('string');
        const data = JSON.parse(jsonStr);
        if (!data.subjects || !Array.isArray(data.subjects)) {
            toast('ZIP invalide : structure incorrecte');
            return;
        }

        // Clear existing files in IndexedDB
        await Store.clearAllFiles();

        // Restore files from ZIP into IndexedDB
        for (const subject of data.subjects) {
            for (const cat of subject.categories) {
                for (const item of cat.items) {
                    if (item.fileId && item.filePath) {
                        const zipFile = zip.file(item.filePath);
                        if (zipFile) {
                            const blob = await zipFile.async('blob');
                            const fileName = item.fileName || item.filePath.split('/').pop();
                            const fileObj = new File([blob], fileName);
                            await Store.saveFile(item.fileId, fileObj);
                        } else {
                            // File referenced but not found in ZIP → reset
                            item.fileId = null;
                        }
                    }
                    // Clean up export-only fields
                    delete item.fileName;
                    delete item.filePath;
                }
            }
        }

        // Save metadata
        Store.importData(JSON.stringify(data));
        toast('Données importées avec succès (ZIP)');
        route();
    } catch (err) {
        console.error('Import ZIP error:', err);
        toast('Erreur lors de l\'import');
    }
}

// ===== Legacy JSON Import (backward compat) =====

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const success = Store.importData(reader.result);
        if (success) {
            toast('Données importées (JSON, sans fichiers)');
            route();
        } else {
            toast('Fichier invalide');
        }
    };
    reader.readAsText(file);
}

// ===== Init =====

function init() {
    window.addEventListener('hashchange', route);

    // Export ZIP
    document.getElementById('btn-export').addEventListener('click', () => {
        exportZip();
    });

    // Import ZIP or JSON
    document.getElementById('btn-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.name.endsWith('.zip')) {
            importZip(file);
        } else {
            importJSON(file);
        }
        e.target.value = '';
    });

    route();
}

document.addEventListener('DOMContentLoaded', init);
