import { Store } from './store.js';
import { renderDashboard } from './dashboard.js';
import { renderSubject } from './subject.js';
import { toast } from './utils.js?v=3';

// ===== UI Helpers =====

function showLoading(msg) {
    let div = document.getElementById('loading-overlay');
    if (!div) {
        div = document.createElement('div');
        div.id = 'loading-overlay';
        div.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        div.innerHTML = `<div class="spinner" style="width:40px;height:40px;border:4px solid var(--blue-light);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;"></div>
        <p id="loading-msg" style="margin-top:1rem;font-weight:600;color:var(--blue-dark);font-family:var(--font);"></p>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
        document.body.appendChild(div);
    }
    document.getElementById('loading-msg').textContent = msg;
    div.style.display = 'flex';
}

function hideLoading() {
    const div = document.getElementById('loading-overlay');
    if (div) div.style.display = 'none';
}

// ===== Router =====

function route() {
    const hash = window.location.hash;
    const app = document.getElementById('app');
    
    if (!hash || hash === '#/') {
        renderDashboard();
    } else if (hash.startsWith('#/subject/')) {
        const id = hash.split('/')[2];
        if (id) renderSubject(id);
        else renderDashboard();
    } else {
        renderDashboard();
    }
}

// ===== ZIP Export =====

function sanitizeName(name) {
    return name.replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ\s_-]/gi, '').trim() || 'Dossier';
}

async function exportZip() {
    try {
        showLoading('Préparation de l\'archive...');
        // allow UI to update
        await new Promise(r => setTimeout(r, 50));
        
        const zip = new window.JSZip();
        const subjects = Store.getSubjects();
        const allFiles = await Store.getAllFiles();

        const fileMap = {};

        for (const subject of subjects) {
            const subjectFolder = sanitizeName(subject.name);
            for (const cat of subject.categories) {
                const catFolder = sanitizeName(cat.name);
                for (const item of cat.items) {
                    if (item.fileId && allFiles[item.fileId]) {
                        const fileData = allFiles[item.fileId];
                        const fileName = fileData.name || `${item.id}.bin`;
                        // FIX: Add item ID to path to avoid collisions
                        const filePath = `${subjectFolder}/${catFolder}/${item.id}_${fileName}`;
                        
                        zip.file(filePath, fileData.blob);
                        fileMap[item.fileId] = { path: filePath, name: fileName, type: fileData.type || '' };
                    }
                }
            }
        }

        const exportData = JSON.parse(JSON.stringify({ subjects }));
        for (const subject of exportData.subjects) {
            for (const cat of subject.categories) {
                for (const item of cat.items) {
                    if (item.fileId && fileMap[item.fileId]) {
                        item.fileName = fileMap[item.fileId].name;
                        item.filePath = fileMap[item.fileId].path;
                        item.fileType = fileMap[item.fileId].type;
                    }
                }
            }
        }

        zip.file('data.json', JSON.stringify(exportData, null, 2));

        showLoading('Compression...');
        await new Promise(r => setTimeout(r, 50));
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `courstrack_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Delay revoke to avoid interrupting download
        setTimeout(() => {
            URL.revokeObjectURL(url);
            if (document.body.contains(a)) document.body.removeChild(a);
        }, 2000);
        
        toast('Données exportées avec succès', 'success');
    } catch (err) {
        console.error('Export ZIP error:', err);
        toast('Erreur lors de l\'exportation', 'error');
    } finally {
        hideLoading();
    }
}

// ===== ZIP Import =====

async function importZip(file) {
    try {
        showLoading('Analyse de l\'archive...');
        await new Promise(r => setTimeout(r, 50));
        
        const zip = await window.JSZip.loadAsync(file);

        const dataFile = zip.file('data.json');
        if (!dataFile) {
            throw new Error('data.json manquant');
        }

        const jsonStr = await dataFile.async('string');
        const data = JSON.parse(jsonStr);
        if (!data.subjects || !Array.isArray(data.subjects)) {
            throw new Error('structure JSON incorrecte');
        }

        showLoading('Extraction des fichiers...');
        await new Promise(r => setTimeout(r, 50));
        
        // Extract all files from ZIP first into memory to ensure safety before clearing DB
        const extractedFiles = [];
        for (const subject of data.subjects) {
            for (const cat of subject.categories) {
                for (const item of cat.items) {
                    if (item.fileId && item.filePath) {
                        const zipFile = zip.file(item.filePath);
                        if (zipFile) {
                            const blob = await zipFile.async('blob');
                            const fileName = item.fileName || item.filePath.split('/').pop();
                            const mimeType = item.fileType || '';
                            extractedFiles.push({
                                id: item.fileId,
                                fileObj: new File([blob], fileName, { type: mimeType })
                            });
                        } else {
                            item.fileId = null;
                        }
                    }
                    delete item.fileName;
                    delete item.filePath;
                    delete item.fileType;
                }
            }
        }

        showLoading('Sauvegarde...');
        await Store.clearAllFiles();
        for (const f of extractedFiles) {
            await Store.saveFile(f.id, f.fileObj);
        }

        Store.importData(JSON.stringify(data));
        toast('Données importées avec succès', 'success');
        route();
    } catch (err) {
        console.error('Import ZIP error:', err);
        toast('Fichier invalide ou corrompu', 'error');
    } finally {
        hideLoading();
    }
}

// ===== Legacy JSON Import (backward compat) =====

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const success = Store.importData(reader.result);
        if (success) {
            toast('Données importées (sans fichiers)', 'info');
            route();
        } else {
            toast('Fichier JSON invalide', 'error');
        }
    };
    reader.readAsText(file);
}

// ===== Init =====

function init() {
    window.addEventListener('hashchange', route);

    document.getElementById('btn-export').addEventListener('click', () => {
        exportZip();
    });

    document.getElementById('btn-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Case insensitive check
        if (file.name.toLowerCase().endsWith('.zip')) {
            importZip(file);
        } else {
            importJSON(file);
        }
        e.target.value = '';
    });

    route();
}

document.addEventListener('DOMContentLoaded', init);
