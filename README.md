# CoursTrack

> **Organise tes cours, progresse facilement.**

Application web minimaliste pour suivre sa progression dans ses cours universitaires — sans inscription, sans serveur, tout tourne dans le navigateur.

![CoursTrack](assets/logo.png)

---

## Fonctionnalités

- **Dashboard** — vue d'ensemble de toutes les matières avec barre de progression globale
- **Matières** — ajouter/supprimer autant de matières que nécessaire
- **Catégories personnalisées** — TD, CM, TP, Projet, Examen… tu définis les tiennes
- **Suivi par élément** — cocher/décocher chaque cours, TP, devoir
- **Fichiers liés** — attacher un PDF (ou tout autre fichier) à chaque élément
- **Export ZIP** — sauvegarde complète : données + fichiers organisés par `matière/catégorie/fichier`
- **Import ZIP** — restauration complète depuis un ZIP exporté, zéro donnée perdue
- **Alerte de retard** — bandeau orange si des matières sont en retard (< 50%)
- **100% offline** — aucune connexion requise après le premier chargement

---

## Stack technique

| Couche | Technologie |
|---|---|
| Interface | HTML5 + CSS3 + JavaScript (ES Modules) |
| Données | `localStorage` (métadonnées) + `IndexedDB` (fichiers) |
| Export/Import | [JSZip 3.10](https://stuk.github.io/jszip/) |
| Typographie | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| Routing | Hash-based (`#/`, `#/subject/:id`) |
| Versioning | Git + GitHub |

Aucun framework, aucun bundler, aucune dépendance npm. Zéro build step.

---

## Structure du projet

```
suivit_cours/
├── index.html          # Point d'entrée SPA
├── css/
│   └── style.css       # Design system CoursTrack (variables, composants)
├── js/
│   ├── app.js          # Router + logique export/import ZIP
│   ├── store.js        # CRUD localStorage + IndexedDB
│   ├── dashboard.js    # Vue dashboard
│   ├── subject.js      # Vue détail matière
│   └── utils.js        # uuid(), calcProgress(), toast(), escapeHtml()
├── assets/
│   └── logo.png        # Logo CoursTrack
├── test.html           # Suite de tests (isolée, ne touche pas aux vraies données)
└── README.md
```

---

## Lancer l'application

Comme l'app utilise des **ES Modules**, elle ne peut pas être ouverte directement via `file://`. Il faut un serveur local :

```bash
# Python (intégré)
python -m http.server 8080

# Node.js
npx serve .
```

Puis ouvre **http://localhost:8080**

---

## Format d'export ZIP

```
courstrack_2026-09-23.zip
├── data.json                        ← toutes les métadonnées
├── Mathématiques/
│   ├── CM/
│   │   └── cours1.pdf
│   └── TD/
│       └── td1.pdf
└── Algorithmique/
    └── TP/
        └── rapport.docx
```

L'import depuis un ancien `.json` (format précédent) reste supporté (rétrocompatible, sans fichiers).

---

## Tests

Ouvre **http://localhost:8080/test.html** pour lancer la suite de tests automatisés.

Les tests utilisent des clés **complètement isolées** (`_test_cours_data` / `_test_cours_files`) — tes données réelles ne sont jamais touchées.

**Scénarios testés :**
1. Création matière / catégories / items
2. Attachement d'un PDF à un item
3. Export ZIP avec arborescence correcte
4. Clear total → Import ZIP → données et fichiers restaurés
5. Vérification MIME type et taille du fichier restauré
6. Suppression item → fichier supprimé de IndexedDB
7. Re-export → fichier supprimé absent du nouveau ZIP

---

## Roadmap

- [ ] Migration VPS + base de données (PostgreSQL)
- [ ] Accès multi-appareils (synchronisation)
- [ ] Version mobile (PWA)
- [ ] Statistiques de progression (graphiques, historique)
- [ ] Notifications de rappel
- [ ] Mode sombre

---

## Licence

Usage personnel. Projet étudiant en cours de développement.
