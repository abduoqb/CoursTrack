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
