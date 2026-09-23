/**
 * Génère un UUID v4.
 */
export function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Calcule le pourcentage de progression d'une matière.
 * @param {Object} subject - La matière avec ses catégories et items.
 * @returns {number} Pourcentage entre 0 et 100.
 */
export function calcProgress(subject) {
    let total = 0, done = 0;
    for (const cat of subject.categories) {
        total += cat.items.length;
        done += cat.items.filter(i => i.done).length;
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
}

/**
 * Retourne la classe CSS pour la couleur de la barre de progression.
 */
export function progressClass(pct) {
    if (pct >= 100) return 'complete';
    if (pct >= 67) return 'high';
    if (pct >= 34) return 'mid';
    return 'low';
}

/**
 * Affiche un toast de notification temporaire (3s).
 */
export function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

/**
 * Échappe le HTML pour éviter les injections XSS.
 */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Calcule les infos d'affichage pour une date d'examen.
 * @param {string} dateStr - Date ISO (YYYY-MM-DD)
 * @returns {{ days: number, label: string, urgency: string, icon: string }}
 */
export function examInfo(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exam = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
        return { days: diff, label: 'Passé', urgency: 'past', icon: '✓' };
    } else if (diff === 0) {
        return { days: 0, label: "Aujourd'hui !", urgency: 'critical', icon: '🔴' };
    } else if (diff === 1) {
        return { days: 1, label: 'Demain !', urgency: 'critical', icon: '🔴' };
    } else if (diff <= 3) {
        return { days: diff, label: `Dans ${diff} jours`, urgency: 'critical', icon: '🔴' };
    } else if (diff <= 7) {
        return { days: diff, label: `Dans ${diff} jours`, urgency: 'warning', icon: '🟠' };
    } else if (diff <= 14) {
        return { days: diff, label: `Dans ${diff} jours`, urgency: 'soon', icon: '🟡' };
    } else {
        return { days: diff, label: `Dans ${diff} jours`, urgency: 'calm', icon: '🔵' };
    }
}
