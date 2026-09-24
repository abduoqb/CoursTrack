import { Store } from './store.js';
import { calcProgress, progressClass, escapeHtml, examInfo } from './utils.js?v=3';

// Couleurs pastel pour différencier les matières
const SUBJECT_COLORS = [
    '#2563EB', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#F59E0B', // amber
    '#10B981', // emerald
    '#06B6D4', // cyan
    '#F97316', // orange
    '#6366F1', // indigo
];

export function renderDashboard() {
    const app = document.getElementById('app');
    const subjects = Store.getSubjects();

    // Stats globales
    let globalTotal = 0, globalDone = 0;
    for (const s of subjects) {
        for (const cat of s.categories) {
            globalTotal += cat.items.length;
            globalDone += cat.items.filter(i => i.done).length;
        }
    }
    const globalProgress = globalTotal === 0 ? 0 : Math.round((globalDone / globalTotal) * 100);
    const globalPClass = progressClass(globalProgress);

    // Matières en retard (< 50% avec des éléments)
    const behindSubjects = subjects.filter(s => {
        const hasItems = s.categories.some(c => c.items.length > 0);
        return hasItems && calcProgress(s) < 50;
    });

    // Examens à venir (tous les examens de toutes les matières, triés, exclut les passés)
    const upcomingExams = [];
    for (const s of subjects) {
        if (!s.exams) continue;
        for (const exam of s.exams) {
            const info = examInfo(exam.date);
            if (info && info.days >= 0) {
                const checkDone = exam.checklist.filter(c => c.done).length;
                const checkTotal = exam.checklist.length;
                upcomingExams.push({ subject: s, exam, info, checkDone, checkTotal });
            }
        }
    }
    upcomingExams.sort((a, b) => a.info.days - b.info.days);

    app.innerHTML = `
        <!-- Résumé global -->
        <div class="global-summary">
            <div class="global-summary-header">
                <h2>Progression globale</h2>
                <span class="global-percentage">${globalProgress}%</span>
            </div>
            <div class="progress-bar progress-bar-lg">
                <div class="progress-fill ${globalPClass}" style="width: ${globalProgress}%"></div>
            </div>
            <div class="global-stats">
                <span>${globalDone}/${globalTotal} cours terminés</span>
                <span>${subjects.length} matière${subjects.length !== 1 ? 's' : ''}</span>
            </div>
        </div>

        ${upcomingExams.length > 0 ? `
        <div class="exams-upcoming">
            <h3 class="exams-upcoming-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Examens à venir
            </h3>
            <div class="exams-list">
                ${upcomingExams.map(e => {
                    const dateFormatted = new Date(e.exam.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
                    const readyPct = e.checkTotal > 0 ? Math.round((e.checkDone / e.checkTotal) * 100) : null;
                    return `
                    <div class="exam-row exam-${e.info.urgency}">
                        <span class="exam-icon">${e.info.icon}</span>
                        <div class="exam-row-info">
                            <span class="exam-name">${escapeHtml(e.subject.name)} — ${escapeHtml(e.exam.name)}</span>
                            ${readyPct !== null ? `<span class="exam-ready">Prêt à ${readyPct}%</span>` : ''}
                        </div>
                        <span class="exam-date">${dateFormatted}</span>
                        <span class="exam-countdown">${e.info.label}</span>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}

        ${behindSubjects.length > 0 ? `
        <div class="behind-alert">
            <span class="behind-icon">⚡</span>
            <span>${behindSubjects.length} matière${behindSubjects.length > 1 ? 's' : ''} en retard :
                ${behindSubjects.map(s => `<strong>${escapeHtml(s.name)}</strong>`).join(', ')}
            </span>
        </div>
        ` : ''}

        <div class="dashboard-header">
            <h2>Mes matières</h2>
        </div>
        <div class="subjects-grid">
            ${subjects.map((s, i) => renderCard(s, i)).join('')}
            <div class="add-card" id="add-subject-card">
                <span>+ Ajouter une matière</span>
            </div>
        </div>
    `;

    // Events
    app.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            window.location.hash = `#/subject/${card.dataset.id}`;
        });
    });

    app.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Supprimer "${btn.dataset.name}" et tout son contenu ?`)) {
                Store.deleteSubject(btn.dataset.id);
                renderDashboard();
            }
        });
    });

    document.getElementById('add-subject-card').addEventListener('click', () => {
        showAddSubjectModal();
    });
}

function renderCard(subject, index) {
    const progress = calcProgress(subject);
    const pClass = progressClass(progress);
    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];

    let totalItems = 0, doneItems = 0;
    for (const cat of subject.categories) {
        totalItems += cat.items.length;
        doneItems += cat.items.filter(i => i.done).length;
    }
    const remaining = totalItems - doneItems;

    // Nearest upcoming exam badge
    const exams = (subject.exams || [])
        .map(e => ({ exam: e, info: examInfo(e.date) }))
        .filter(e => e.info && e.info.days >= 0)
        .sort((a, b) => a.info.days - b.info.days);

    let examBadgeHtml = '';
    if (exams.length > 0) {
        const nearest = exams[0];
        examBadgeHtml = `<span class="exam-badge exam-badge-${nearest.info.urgency}">${nearest.info.icon} ${nearest.info.label}</span>`;
        if (exams.length > 1) {
            examBadgeHtml += `<span class="exam-badge exam-badge-calm">+${exams.length - 1} examen${exams.length > 2 ? 's' : ''}</span>`;
        }
    }

    return `
        <div class="subject-card" data-id="${subject.id}" style="border-left-color: ${color}">
            <button class="btn-icon danger delete-btn" data-id="${subject.id}" data-name="${escapeHtml(subject.name)}" title="Supprimer">×</button>
            <span class="card-name">${escapeHtml(subject.name)}</span>
            ${examBadgeHtml}
            <div class="card-stats">
                ${doneItems > 0 ? `<span class="stat-badge done">✓ ${doneItems} terminé${doneItems > 1 ? 's' : ''}</span>` : ''}
                ${remaining > 0 ? `<span class="stat-badge remaining">${remaining} restant${remaining > 1 ? 's' : ''}</span>` : ''}
            </div>
            <div class="card-footer">
                <div class="card-progress-row">
                    <div class="progress-bar">
                        <div class="progress-fill ${pClass}" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-pct">${progress}%</span>
                </div>
            </div>
        </div>
    `;
}

function showAddSubjectModal() {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Nouvelle matière';
    document.getElementById('modal-body').innerHTML = `
        <label for="subject-name">Nom de la matière</label>
        <input type="text" id="subject-name" placeholder="ex : Mathématiques" autofocus>
    `;

    overlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('subject-name').focus(), 100);

    const cleanup = () => {
        overlay.classList.add('hidden');
        ['modal-confirm', 'modal-cancel', 'modal-close'].forEach(id => {
            const el = document.getElementById(id);
            el.replaceWith(el.cloneNode(true));
        });
    };

    const doConfirm = () => {
        const name = document.getElementById('subject-name').value.trim();
        if (name) {
            Store.addSubject(name);
            cleanup();
            renderDashboard();
        }
    };

    document.getElementById('modal-confirm').addEventListener('click', doConfirm);
    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    document.getElementById('modal-close').addEventListener('click', cleanup);
    document.getElementById('subject-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConfirm();
        if (e.key === 'Escape') cleanup();
    });
}
