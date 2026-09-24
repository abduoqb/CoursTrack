import { Store } from './store.js';
import { calcProgress, progressClass, uuid, toast, escapeHtml, examInfo } from './utils.js?v=3';

export function renderSubject(subjectId) {
    const app = document.getElementById('app');
    const subject = Store.getSubject(subjectId);

    if (!subject) {
        app.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>Matière introuvable</p>
                <a class="back-link" href="#/">← Retour au dashboard</a>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Retour
            </a>
            <h1 class="subject-title">${escapeHtml(subject.name)}</h1>

            ${examsHtml ? `
            <div class="exams-section">
                ${examsHtml}
            </div>
            ` : ''}

            <div class="subject-progress-summary">
                <span class="progress-text">${doneItems}/${totalItems}</span>
                <div class="progress-bar progress-bar-lg">
                    <div class="progress-fill ${pClass}" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}%</span>
            </div>

            <div class="subject-actions">
                <button class="btn btn-primary" id="btn-add-category">+ Catégorie</button>
                <button class="btn btn-secondary" id="btn-add-exam">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    + Examen
                </button>
            </div>

            <div class="categories-container">
                ${subject.categories.map(cat => renderCategory(subjectId, cat)).join('')}
                ${subject.categories.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📂</div>
                        <p>Aucune catégorie.<br>Ajoute TP, CM, TD, Projet…</p>
                    </div>
                ` : ''}
            </div>
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
                    <button class="btn-icon delete-exam-btn" data-exam-id="${exam.id}" title="Supprimer l'examen">×</button>
                </div>
            </div>

            ${checkTotal > 0 ? `
            <div class="exam-ready-bar">
                <div class="exam-ready-info">
                    <span>Préparation</span>
                    <span class="exam-ready-pct">${readyPct}%</span>
                </div>
                <div class="progress-bar progress-bar-sm">
                    <div class="progress-fill ${readyPct === 100 ? 'high' : readyPct >= 50 ? 'mid' : 'low'}" style="width: ${readyPct}%"></div>
                </div>
            </div>
            ` : ''}

            <div class="exam-checklist" data-exam-id="${exam.id}">
                ${exam.checklist.map(item => `
                    <label class="checklist-item">
                        <input type="checkbox" class="checklist-cb" data-exam-id="${exam.id}" data-item-id="${item.id}" ${item.done ? 'checked' : ''}>
                        <span class="checklist-text ${item.done ? 'done' : ''}">${escapeHtml(item.text)}</span>
                        <button class="btn-icon-sm delete-checklist-btn" data-exam-id="${exam.id}" data-item-id="${item.id}" title="Retirer">×</button>
                    </label>
                `).join('')}
            </div>

            <div class="exam-add-checklist">
                <input type="text" class="checklist-input" data-exam-id="${exam.id}" placeholder="Ajouter une notion à réviser…">
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
                    <button class="btn-icon danger delete-category-btn" data-category="${escapeHtml(category.name)}" title="Supprimer">×</button>
                </div>
            </div>
            <div class="category-items">
                ${category.items.length === 0 ? `
                    <div style="padding: 1.25rem; text-align: center; color: var(--text-secondary); font-size: 0.8125rem;">
                        Aucun élément
                    </div>
                ` : ''}
                ${category.items.map(item => renderItem(category.name, item)).join('')}
            </div>
            <div class="add-item-row">
                <button class="btn btn-secondary btn-add-item" data-category="${escapeHtml(category.name)}">
                    + Ajouter
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
                ${item.done ? 'checked' : ''}>
            <span class="item-title ${item.done ? 'done' : ''}">${escapeHtml(item.title)}</span>
            <div class="item-actions">
                ${item.fileId ? `
                    <button class="file-badge open-file-btn" data-file-id="${item.fileId}" title="Ouvrir le fichier">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Fichier
                    </button>
                ` : ''}
                <label class="btn-icon" title="Importer un fichier" style="cursor:pointer;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <input type="file" class="import-file-input"
                        data-category="${escapeHtml(categoryName)}"
                        data-item-id="${item.id}"
                        hidden>
                </label>
                <button class="btn-icon danger delete-item-btn"
                    data-category="${escapeHtml(categoryName)}"
                    data-item-id="${item.id}"
                    title="Supprimer">×</button>
            </div>
        </div>
    `;
}

function bindEvents(subjectId) {
    const app = document.getElementById('app');

    document.getElementById('btn-add-category').addEventListener('click', () => {
        showAddCategoryModal(subjectId);
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
            if (confirm('Supprimer cet examen ?')) {
                Store.deleteExam(subjectId, btn.dataset.examId);
                toast('Examen supprimé');
                renderSubject(subjectId);
            }
        });
    });

    // Category / Item events (unchanged)
    app.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            Store.toggleItem(subjectId, cb.dataset.category, cb.dataset.itemId);
            renderSubject(subjectId);
        });
    });

    app.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm(`Supprimer la catégorie "${btn.dataset.category}" ?`)) {
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
            if (confirm('Supprimer cet élément ?')) {
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
                toast(`Fichier "${file.name}" importé`);
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
        <label for="category-name">Nom de la catégorie</label>
        <input type="text" id="category-name" placeholder="ex : TP, CM, TD, Projet…" autofocus>
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
                toast('Cette catégorie existe déjà');
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
    document.getElementById('modal-title').textContent = `Ajouter à ${categoryName}`;
    document.getElementById('modal-body').innerHTML = `
        <label for="item-title">Titre</label>
        <input type="text" id="item-title" placeholder="ex : TP1 - Intégrales" autofocus>
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
        <label for="exam-name">Nom de l'examen</label>
        <input type="text" id="exam-name" placeholder="ex : Partiel, CC1, Rattrapage…" autofocus>
        <label for="exam-date" style="margin-top: 0.75rem; display: block;">Date</label>
        <input type="date" id="exam-date"
               style="width:100%; padding:0.625rem 0.875rem; border:1px solid var(--border);
                      border-radius:var(--radius-sm); font-family:inherit; font-size:0.875rem;
                      outline:none; color:var(--text); cursor:pointer;">
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
            toast('Examen ajouté');
            cleanup();
            renderSubject(subjectId);
        } else if (!name) {
            toast('Donne un nom à l\'examen');
        } else {
            toast('Choisis une date');
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
