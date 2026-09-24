// ===== UUID =====

export function uuid() {
    return crypto.randomUUID?.() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
}

// ===== Progress =====

export function calcProgress(subject) {
    if (!subject?.categories?.length) return 0;
    let total = 0, done = 0;
    for (const cat of subject.categories) {
        if (!cat.items) continue;
        total += cat.items.length;
        done += cat.items.filter(i => i.done).length;
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function progressClass(pct) {
    if (pct >= 75) return 'high';
    if (pct >= 40) return 'mid';
    return 'low';
}

// ===== HTML Escaping (fixes quotes) =====

export function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== Toast System (stacking + types) =====

export function toast(message, type = 'default') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-visible'));
    setTimeout(() => {
        el.classList.remove('toast-visible');
        el.classList.add('toast-exit');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ===== Exam Info =====

export function examInfo(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exam = new Date(dateStr + 'T00:00:00');
    if (isNaN(exam.getTime())) return null;
    const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { days: diff, label: 'Passé', urgency: 'past', icon: '✓' };
    if (diff === 0) return { days: 0, label: "Aujourd'hui !", urgency: 'critical', icon: '🔴' };
    if (diff === 1) return { days: 1, label: 'Demain !', urgency: 'critical', icon: '🔴' };
    if (diff <= 3) return { days: diff, label: `Dans ${diff} jours`, urgency: 'critical', icon: '🔴' };
    if (diff <= 7) return { days: diff, label: `Dans ${diff} jours`, urgency: 'warning', icon: '🟠' };
    if (diff <= 14) return { days: diff, label: `Dans ${diff} jours`, urgency: 'soon', icon: '🟡' };
    return { days: diff, label: `Dans ${diff} jours`, urgency: 'calm', icon: '🔵' };
}
