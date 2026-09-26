import { Store } from './store.js';
import { calcProgress, progressClass, escapeHtml, examInfo } from './utils.js?v=6';

// Palette de tons terre pour distinguer les matières sans sortir de la palette générale.
const SUBJECT_COLORS = [
    { color: '#c0492a', tint: '#f3e0d3' }, // terracotta
    { color: '#96712c', tint: '#f1ead0' }, // ocre
    { color: '#7a6f9e', tint: '#eae6f0' }, // prune muette
    { color: '#6b7a3d', tint: '#e8ecd0' }, // sauge / olive
    { color: '#b45d6b', tint: '#f3e1e4' }, // rose poudré
    { color: '#3f6f7a', tint: '#dde9ec' }, // bleu-vert profond
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

    // Examens à venir (triés par proximité, passés exclus)
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

    // Ligne de résumé dynamique — remplace la description vague par un chiffre concret
    const summaryLine = subjects.length === 0
        ? ''
        : `${subjects.length} matière${subjects.length > 1 ? 's' : ''} · ${globalDone} sur ${globalTotal} cours coché${globalDone > 1 ? 's' : ''}`;

    app.innerHTML = `
        <div class="dashboard">
            <section class="page-heading" aria-labelledby="dashboard-title">
                <div>
                    <h1 id="dashboard-title">Tes cours</h1>
                    ${summaryLine ? `<p>${summaryLine}</p>` : ''}
                </div>
                ${subjects.length > 0 ? `
                    <button class="btn btn-primary" id="add-subject-top">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Nouvelle matière
                    </button>
                ` : ''}
            </section>

            ${subjects.length > 0 ? `
                <section class="global-summary" aria-labelledby="progress-title">
                    <div class="summary-copy">
                        <h2 id="progress-title">Où tu en es</h2>
                    </div>
                    <div class="summary-progress">
                        <div class="summary-progress-heading">
                            <span>Semestre entier</span>
                            <strong>${globalProgress}<small>%</small></strong>
                        </div>
                        <div class="progress-bar progress-bar-lg" role="progressbar" aria-label="Progression sur le semestre entier" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${globalProgress}">
                            <div class="progress-fill ${globalPClass}" style="width: ${globalProgress}%"></div>
                        </div>
                    </div>
                </section>

                ${upcomingExams.length > 0 ? `
                    <section class="exams-upcoming" aria-labelledby="upcoming-title">
                        <div class="panel-heading">
                            <div class="panel-heading-icon" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
                            </div>
                            <div><h2 id="upcoming-title">Prochains examens</h2></div>
                        </div>
                        <div class="exams-list">
                            ${upcomingExams.map(e => {
                                const dateFormatted = new Date(e.exam.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
                                const readyPct = e.checkTotal > 0 ? Math.round((e.checkDone / e.checkTotal) * 100) : null;
                                return `
                                <a class="exam-row exam-${e.info.urgency}" href="#/subject/${e.subject.id}" aria-label="${escapeHtml(e.subject.name)} — ${escapeHtml(e.exam.name)}, ${dateFormatted}, ${e.info.label}">
                                    <span class="exam-icon" aria-hidden="true">${e.info.icon}</span>
                                    <span class="exam-row-info">
                                        <span class="exam-name">${escapeHtml(e.subject.name)} <span class="exam-separator">·</span> ${escapeHtml(e.exam.name)}</span>
                                        ${readyPct !== null ? `<span class="exam-ready">Prêt à ${readyPct}%</span>` : ''}
                                    </span>
                                    <span class="exam-date">${dateFormatted}</span>
                                    <span class="exam-countdown">${e.info.label}</span>
                                    <svg class="exam-row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                                </a>
                                `;
                            }).join('')}
                        </div>
                    </section>
                ` : ''}

                ${behindSubjects.length > 0 ? `
                    <aside class="behind-alert">
                        <span class="behind-icon" aria-hidden="true">✦</span>
                        <span><strong>Un peu en retard :</strong><span class="focus-list">${behindSubjects.map(s => escapeHtml(s.name)).join(' · ')}</span></span>
                    </aside>
                ` : ''}

                <section class="subjects-section" aria-labelledby="subjects-title">
                    <div class="dashboard-header">
                        <div><h2 id="subjects-title">Mes matières</h2></div>
                        <span class="subject-total">${subjects.length} matière${subjects.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="subjects-grid">
                        ${subjects.map((s, i) => renderCard(s, i)).join('')}
                        <button class="add-card" id="add-subject-card" type="button">
                            <span class="add-card-icon" aria-hidden="true">+</span>
                            <span>Ajouter une matière</span>
                        </button>
                    </div>
                </section>
            ` : `
                <section class="welcome-card" aria-labelledby="welcome-title">
                    <div class="welcome-art" aria-hidden="true">
                        <div class="welcome-art-sheet sheet-back"></div>
                        <div class="welcome-art-sheet sheet-front">
                            <span></span><span></span><span></span>
                            <i><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></i>
                        </div>
                    </div>
                    <h2 id="welcome-title">Ton cahier est vide.</h2>
                    <p>Ajoute une matière. Ensuite tu pourras y déposer tes CM, TD, TP, et noter tes dates d'examens.</p>
                    <button class="btn btn-primary btn-welcome" id="add-subject-card" type="button">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Créer ma première matière
                    </button>
                </section>
            `}
        </div>
    `;

    // Events
    app.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Supprimer « ${btn.dataset.name} » ? Ses cours et fichiers partent avec.`)) {
                Store.deleteSubject(btn.dataset.id);
                renderDashboard();
                window.scrollTo(0, 0);
            }
        });
    });

    app.querySelectorAll('#add-subject-card, #add-subject-top').forEach(button => {
        button.addEventListener('click', showAddSubjectModal);
    });
}

function renderCard(subject, index) {
    const progress = calcProgress(subject);
    const pClass = progressClass(progress);
    const colors = SUBJECT_COLORS[index % SUBJECT_COLORS.length];

    let totalItems = 0, doneItems = 0;
    for (const cat of subject.categories) {
        totalItems += cat.items.length;
        doneItems += cat.items.filter(i => i.done).length;
    }
    const remaining = totalItems - doneItems;

    // Prochain examen à venir
    const exams = (subject.exams || [])
        .map(e => ({ exam: e, info: examInfo(e.date) }))
        .filter(e => e.info && e.info.days >= 0)
        .sort((a, b) => a.info.days - b.info.days);

    let examBadgeHtml = '';
    if (exams.length > 0) {
        const nearest = exams[0];
        const iconPart = nearest.info.icon ? `${nearest.info.icon} ` : '';
        examBadgeHtml = `<span class="exam-badge exam-badge-${nearest.info.urgency}">${iconPart}${nearest.info.label}</span>`;
        if (exams.length > 1) {
            examBadgeHtml += `<span class="exam-badge exam-badge-calm">+${exams.length - 1} examen${exams.length > 2 ? 's' : ''}</span>`;
        }
    }

    return `
        <article class="subject-card" style="--subject-color: ${colors.color}; --subject-tint: ${colors.tint}">
            <a class="subject-card-link" href="#/subject/${subject.id}">
                <div class="subject-card-top">
                    <span class="subject-mark" aria-hidden="true">${escapeHtml(subject.name.trim().charAt(0).toUpperCase() || 'M')}</span>
                    <span class="card-name">${escapeHtml(subject.name)}</span>
                </div>
                ${examBadgeHtml ? `<div class="card-exams">${examBadgeHtml}</div>` : ''}
                <div class="card-stats">
                    ${doneItems > 0 ? `<span class="stat-badge done">✓ ${doneItems} coché${doneItems > 1 ? 's' : ''}</span>` : ''}
                    ${remaining > 0 ? `<span class="stat-badge remaining">${remaining} à faire</span>` : ''}
                    ${totalItems === 0 ? `<span class="stat-badge remaining">Rien encore</span>` : ''}
                </div>
                <div class="card-footer">
                    <div class="card-progress-row">
                        <div class="progress-bar" role="progressbar" aria-label="Progression de ${escapeHtml(subject.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                            <div class="progress-fill ${pClass}" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-pct">${progress}%</span>
                    </div>
                </div>
            </a>
            <button class="btn-icon danger delete-btn" data-id="${subject.id}" data-name="${escapeHtml(subject.name)}" aria-label="Supprimer ${escapeHtml(subject.name)}" title="Supprimer la matière">×</button>
        </article>
    `;
}

function showAddSubjectModal() {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Nouvelle matière';
    document.getElementById('modal-body').innerHTML = `
        <label for="subject-name">Comment tu l'appelles ?</label>
        <input type="text" id="subject-name" placeholder="Maths, Algo, Anglais…" autofocus>
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
