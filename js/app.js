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

// ===== Init =====

function init() {
    window.addEventListener('hashchange', route);

    // Export JSON
    document.getElementById('btn-export').addEventListener('click', () => {
        const data = Store.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `courstrack_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Données exportées');
    });

    // Import JSON
    document.getElementById('btn-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const success = Store.importData(reader.result);
                if (success) {
                    toast('Données importées avec succès');
                    route();
                } else {
                    toast('Fichier invalide');
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        }
    });

    route();
}

document.addEventListener('DOMContentLoaded', init);
