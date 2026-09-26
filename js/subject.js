import { Store } from './store.js';
import { calcProgress, progressClass, uuid, toast, escapeHtml, examInfo } from './utils.js?v=6';

export function renderSubject(subjectId) {
    const app = document.getElementById('app');
    const subject = Store.getSubject(subjectId);

    if (!subject) {
        app.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">·</div>
                <p>Cette matière n'existe plus.</p>
                <a class="back-link" href="#/">← Retour au cahier</a>
            </div>
        `;
        return;
    }

    const progress = calcProgress(subject);
    const pClass = progressClass(progress);
    let totalItems = 0, doneItems = 0;
    for (const cat of subject.categories) {
        totalItems += cat.items.length;
        doneItems += cat.items.filter(i => i.done).length;
    }

    // Exams section
    const exams = subject.exams || [];
    const examsHtml = exams.length > 0 ? exams.map(exam => renderExamCard(exam)).join('') : '';

    app.innerHTML = `
        <div class="subject-detail">
            <a class="back-link" href="#/">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                Toutes les matières
            </a>

            <section class="subject-page-heading" aria-labelledby="subject-title">
                <div class="subject-heading-copy">
                    <h1 class="subject-title" id="subject-title">${escapeHtml(subject.name)}</h1>
                </div>
                <div class="subject-actions">
                    <button class="btn btn-secondary" id="btn-add-exam">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
                        Ajouter un examen
                    </button>
                    <button class="btn btn-primary" id="btn-add-category">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        Ajouter une catégorie
                    </button>
                </div>
            </section>

            <section class="subject-progress-summary" aria-label="Progression de la matière">
                <div class="subject-progress-copy">
                    <span>Coché</span>
                    <strong>${doneItems} <small>sur ${totalItems}</small></strong>
                </div>
                <div class="subject-progress-track progress-bar" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                    <div class="progress-fill ${pClass}" style="width: ${progress}%"></div>
                </div>
                <span class="subject-progress-percent">${progress}<small>%</small></span>
            </section>

            ${examsHtml ? `
                <section class="subject-exams" aria-labelledby="subject-exams-title">
                    <div class="section-heading">
                        <div><h2 id="subject-exams-title">Examens</h2></div>
                        <span class="section-count">${exams.length} examen${exams.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="exams-section">${examsHtml}</div>
                </section>
            ` : ''}

            <section class="subject-courses" aria-labelledby="courses-title">
                <div class="section-heading">
                    <div><h2 id="courses-title">Cours</h2><p>Regroupés par CM, TD, TP…</p></div>
                    ${subject.categories.length > 0 ? `<span class="section-count">${subject.categories.length} catégorie${subject.categories.length > 1 ? 's' : ''}</span>` : ''}
                </div>
                <div class="categories-container">
                    ${subject.categories.map(cat => renderCategory(subjectId, cat)).join('')}
                    ${subject.categories.length === 0 ? `
                        <div class="empty-state empty-categories">
                            <span class="empty-category-icon" aria-hidden="true">
                                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.75 6.75h6l2 2h8.5v8.5a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2z"/><path d="M3.75 8.75v-2a2 2 0 0 1 2-2h5l2 2"/></svg>
                            </span>
                            <h3>Rien ici pour l'instant.</h3>
                            <p>Une catégorie, c'est un dossier : CM, TD, TP… tu choisis.</p>
                            <button class="btn btn-primary btn-create-first-category" type="button">Créer une catégorie</button>
                        </div>
                    ` : ''}
                </div>
            </section>
        </div>
    `;

    bindEvents(subjectId);
}

function renderExamCard(exam) {
    const eInfo = examInfo(exam.date);
    if (!eInfo) return '';

    const dateFormatted = new Date(exam.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const checkDone = exam.checklist.filter(c => c.done).length;
    const checkTotal = exam.checklist.length;
    const readyPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

    return `
        <div class="exam-card exam-card-${eInfo.urgency}" data-exam-id="${exam.id}">
            <div class="exam-card-header">
                <div class="exam-card-left">
                    <span class="exam-card-icon">${eInfo.icon}</span>
                    <div>
                        <span class="exam-card-name">${escapeHtml(exam.name)}</span>
                        <span class="exam-card-date">${dateFormatted}</span>
                    </div>
                </div>
                <div class="exam-card-right">
                    <span class="exam-card-countdown">${eInfo.label}</span>
                    <button class="btn-icon delete-exam-btn" data-exam-id="${exam.id}" title="Retirer l'examen" aria-label="Retirer l'examen ${escapeHtml(exam.name)}">×</button>
                </div>
            </div>

            ${checkTotal > 0 ? `
            <div class="exam-ready-bar">
                <div class="exam-ready-info">
                    <span>Prêt</span>
                    <span class="exam-ready-pct">${readyPct}%</span>
                </div>
                <div class="progress-bar progress-bar-sm">
                    <div class="progress-fill ${readyPct === 100 ? 'high' : readyPct >= 50 ? 'mid' : 'low'}" style="width: ${readyPct}%"></div>
                </div>
            </div>
            ` : ''}

            <div class="exam-checklist" data-exam-id="${exam.id}">
                ${exam.checklist.map(item => `
                    <div class="checklist-item">
                        <input type="checkbox" class="checklist-cb" data-exam-id="${exam.id}" data-item-id="${item.id}" aria-label="${escapeHtml(item.text)}" ${item.done ? 'checked' : ''}>
                        <span class="checklist-text ${item.done ? 'done' : ''}">${escapeHtml(item.text)}</span>
                        <button class="btn-icon-sm delete-checklist-btn" data-exam-id="${exam.id}" data-item-id="${item.id}" title="Retirer">×</button>
                    </div>
                `).join('')}
            </div>

            <div class="exam-add-checklist">
                <input type="text" class="checklist-input" data-exam-id="${exam.id}" placeholder="Une notion à revoir…">
                <button class="btn-icon-sm add-checklist-btn" data-exam-id="${exam.id}" title="Ajouter">+</button>
            </div>
        </div>
    `;
}

function renderCategory(subjectId, category) {
    const doneCount = category.items.filter(i => i.done).length;
    return `
        <div class="category-card">
            <div class="category-header">
                <h3>${escapeHtml(category.name)}</h3>
                <div style="display:flex; align-items:center; gap:0.375rem;">
                    <span class="category-count">${doneCount}/${category.items.length}</span>
                    <button class="btn-icon danger delete-category-btn" data-category="${escapeHtml(category.name)}" title="Supprimer la catégorie" aria-label="Supprimer la catégorie ${escapeHtml(category.name)}">×</button>
                </div>
            </div>
            <div class="category-items">
                ${category.items.length === 0 ? `
                    <div class="category-empty">Vide.</div>
                ` : ''}
                ${category.items.map(item => renderItem(category.name, item)).join('')}
            </div>
            <div class="add-item-row">
                <button class="btn btn-secondary btn-add-item" data-category="${escapeHtml(category.name)}">
                    + Ajouter un cours
                </button>
            </div>
        </div>
    `;
}

function renderItem(categoryName, item) {
    return `
        <div class="category-item">
            <input type="checkbox" class="item-checkbox"
                data-category="${escapeHtml(categoryName)}"
                data-item-id="${item.id}"
                aria-label="${escapeHtml(item.title)}"
                ${item.done ? 'checked' : ''}>
            <span class="item-title ${item.done ? 'done' : ''}">${escapeHtml(item.title)}</span>
            <div class="item-actions">
                ${item.fileId ? `
                    <button class="file-badge open-file-btn" data-file-id="${item.fileId}" title="Ouvrir le fichier" aria-label="Ouvrir le fichier joint à ${escapeHtml(item.title)}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Fichier
                    </button>
                ` : ''}
                <label class="btn-icon attach-file-label" title="Joindre un fichier" aria-label="Joindre un fichier à ${escapeHtml(item.title)}" style="cursor:pointer;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <input type="file" class="import-file-input"
                        data-category="${escapeHtml(categoryName)}"
                        data-item-id="${item.id}"
                        hidden>
                </label>
                <button class="btn-icon danger delete-item-btn"
                    data-category="${escapeHtml(categoryName)}"
                    data-item-id="${item.id}"
                    title="Supprimer le cours" aria-label="Supprimer ${escapeHtml(item.title)}">×</button>
            </div>
        </div>
    `;
}

function bindEvents(subjectId) {
    const app = document.getElementById('app');

    document.getElementById('btn-add-category').addEventListener('click', () => {
        showAddCategoryModal(subjectId);
    });

    app.querySelectorAll('.btn-create-first-category').forEach(button => {
        button.addEventListener('click', () => showAddCategoryModal(subjectId));
    });

    document.getElementById('btn-add-exam').addEventListener('click', () => {
        showAddExamModal(subjectId);
    });

    // Exam checklist checkboxes
    app.querySelectorAll('.checklist-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            Store.toggleChecklistItem(subjectId, cb.dataset.examId, cb.dataset.itemId);
            renderSubject(subjectId);
        });
    });

    // Delete checklist item
    app.querySelectorAll('.delete-checklist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            Store.deleteChecklistItem(subjectId, btn.dataset.examId, btn.dataset.itemId);
            renderSubject(subjectId);
        });
    });

    // Add checklist item (button + Enter key)
    app.querySelectorAll('.add-checklist-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = app.querySelector(`.checklist-input[data-exam-id="${btn.dataset.examId}"]`);
            addChecklistFromInput(subjectId, btn.dataset.examId, input);
        });
    });

    app.querySelectorAll('.checklist-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addChecklistFromInput(subjectId, input.dataset.examId, input);
            }
        });
    });

    // Delete exam
    app.querySelectorAll('.delete-exam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Retirer cet examen ?')) {
                Store.deleteExam(subjectId, btn.dataset.examId);
                toast('Examen retiré');
                renderSubject(subjectId);
            }
        });
    });

    // Category / Item events
    app.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            Store.toggleItem(subjectId, cb.dataset.category, cb.dataset.itemId);
            renderSubject(subjectId);
        });
    });

    app.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm(`Supprimer la catégorie « ${btn.dataset.category} » ? Ses cours partent avec.`)) {
                Store.deleteCategory(subjectId, btn.dataset.category);
                renderSubject(subjectId);
            }
        });
    });

    app.querySelectorAll('.btn-add-item').forEach(btn => {
        btn.addEventListener('click', () => {
            showAddItemModal(subjectId, btn.dataset.category);
        });
    });

    app.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Supprimer ce cours ?')) {
                Store.deleteItem(subjectId, btn.dataset.category, btn.dataset.itemId);
                renderSubject(subjectId);
            }
        });
    });

    app.querySelectorAll('.import-file-input').forEach(input => {
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (file) {
                const fileId = uuid();
                await Store.saveFile(fileId, file);
                Store.setItemFile(subjectId, input.dataset.category, input.dataset.itemId, fileId);
                toast(`${file.name} ajouté`);
                renderSubject(subjectId);
            }
        });
    });

    app.querySelectorAll('.open-file-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = window.open('about:blank', '_blank');
            const fileData = await Store.getFile(btn.dataset.fileId);
            if (fileData) {
                const blob = new Blob([fileData.blob], { type: fileData.type });
                const url = URL.createObjectURL(blob);
                tab.location.href = url;
            } else {
                tab.close();
            }
        });
    });
}

function addChecklistFromInput(subjectId, examId, input) {
    const text = input.value.trim();
    if (text) {
        Store.addChecklistItem(subjectId, examId, text);
        renderSubject(subjectId);
        // Re-focus the input after re-render
        setTimeout(() => {
            const newInput = document.querySelector(`.checklist-input[data-exam-id="${examId}"]`);
            if (newInput) newInput.focus();
        }, 50);
    }
}

// ===== Modals =====

function showAddCategoryModal(subjectId) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Nouvelle catégorie';
    document.getElementById('modal-body').innerHTML = `
        <label for="category-name">Nom</label>
        <input type="text" id="category-name" placeholder="TP, CM, TD, projet…" autofocus>
    `;

    overlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('category-name').focus(), 100);

    const cleanup = () => {
        overlay.classList.add('hidden');
        ['modal-confirm', 'modal-cancel', 'modal-close'].forEach(id => {
            const el = document.getElementById(id);
            el.replaceWith(el.cloneNode(true));
        });
    };

    const doConfirm = () => {
        const name = document.getElementById('category-name').value.trim();
        if (name) {
            const result = Store.addCategory(subjectId, name);
            if (result === null) {
                toast('Tu as déjà cette catégorie.');
                return;
            }
            cleanup();
            renderSubject(subjectId);
        }
    };

    document.getElementById('modal-confirm').addEventListener('click', doConfirm);
    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    document.getElementById('modal-close').addEventListener('click', cleanup);
    document.getElementById('category-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConfirm();
        if (e.key === 'Escape') cleanup();
    });
}

function showAddItemModal(subjectId, categoryName) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = `Nouveau cours dans ${categoryName}`;
    document.getElementById('modal-body').innerHTML = `
        <label for="item-title">Titre du cours</label>
        <input type="text" id="item-title" placeholder="TP1 — Intégrales" autofocus>
    `;

    overlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('item-title').focus(), 100);

    const cleanup = () => {
        overlay.classList.add('hidden');
        ['modal-confirm', 'modal-cancel', 'modal-close'].forEach(id => {
            const el = document.getElementById(id);
            el.replaceWith(el.cloneNode(true));
        });
    };

    const doConfirm = () => {
        const title = document.getElementById('item-title').value.trim();
        if (title) {
            Store.addItem(subjectId, categoryName, title);
            cleanup();
            renderSubject(subjectId);
        }
    };

    document.getElementById('modal-confirm').addEventListener('click', doConfirm);
    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    document.getElementById('modal-close').addEventListener('click', cleanup);
    document.getElementById('item-title').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConfirm();
        if (e.key === 'Escape') cleanup();
    });
}

function showAddExamModal(subjectId) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Nouvel examen';
    document.getElementById('modal-body').innerHTML = `
        <label for="exam-name">Nom</label>
        <input type="text" id="exam-name" placeholder="Partiel, CC1, Rattrapage…" autofocus>
        <label for="exam-date" style="margin-top: 0.75rem; display: block;">Date</label>
        <input type="date" id="exam-date">
    `;

    overlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('exam-name').focus(), 100);

    const cleanup = () => {
        overlay.classList.add('hidden');
        ['modal-confirm', 'modal-cancel', 'modal-close'].forEach(id => {
            const el = document.getElementById(id);
            el.replaceWith(el.cloneNode(true));
        });
    };

    const doConfirm = () => {
        const name = document.getElementById('exam-name').value.trim();
        const date = document.getElementById('exam-date').value;
        if (name && date) {
            Store.addExam(subjectId, name, date);
            toast('Examen noté');
            cleanup();
            renderSubject(subjectId);
        } else if (!name) {
            toast('Donne un nom à l\'examen');
        } else {
            toast('Il faut aussi une date');
        }
    };

    document.getElementById('modal-confirm').addEventListener('click', doConfirm);
    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    document.getElementById('modal-close').addEventListener('click', cleanup);
    document.getElementById('exam-date').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConfirm();
        if (e.key === 'Escape') cleanup();
    });
}
