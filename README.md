# Cahier

> **Un carnet de cours. Rien de plus, rien de moins.**

Application web minimaliste pour suivre ce que tu fais dans tes études — sans compte, sans serveur, tout dans le navigateur. Sauvegarde complète, restore complète. Accès hors ligne une fois chargé.

**Déployée sur [cahier-opal.vercel.app](https://cahier-opal.vercel.app/#/)**

---

## Ce qu'elle fait

- **Tes matières** — une liste, c'est tout. Ajoute/supprime comme tu veux.
- **Catégories** — CM, TD, TP, Projets, ce que tu veux. À toi de les créer.
- **Coches** — chaque cours que tu fais, tu le coches. La barre avance.
- **Fichiers** — attache un PDF (ou n'importe quel fichier) à chaque cours.
- **Examens** — date + liste de notions à réviser. Suivi de ta préparation.
- **Sauvegarde locale** — tout vit dans ton navigateur. Zéro donnée envoyée ailleurs.
- **Export/Import ZIP** — dump complet matières + fichiers. À toi de le garder.
- **Hors ligne** — pas de connexion après le premier chargement.

---

## Tech

| | |
|---|---|
| **Frontend** | HTML5 + CSS3 + JavaScript (ES Modules, zéro framework) |
| **Données** | `localStorage` (JSON) + `IndexedDB` (fichiers) |
| **Typographie** | Fraunces (titres) + Inter (corps) |
| **Files** | [JSZip 3.10](https://stuk.github.io/jszip/) pour export/import |
| **Deploy** | Vercel (static) |

Zéro npm, zéro build. Ouvre l'HTML, ça marche.

---

## Lancer localement

L'app utilise **ES Modules**, donc elle ne peut pas être ouverte en `file://`. Besoin d'un serveur :

```bash
# Python
python -m http.server 8080

# Ou Node
npx serve .
```

Puis **http://localhost:8080**

---

## Structure

```
.
├── index.html                 # Point d'entrée SPA
├── css/style.css              # Design system (variables, composants)
├── js/
│   ├── app.js                 # Router + export/import ZIP
│   ├── store.js               # localStorage + IndexedDB CRUD
│   ├── dashboard.js           # Vue d'accueil
│   ├── subject.js             # Vue détail matière
│   └── utils.js               # Utilitaires (uuid, progress, toast…)
├── assets/
│   └── logo.png               # Logo historique
└── test.html                  # Suite de tests (données isolées)
```

---

## Format ZIP export

```
cahier_2026-09-26.zip
├── data.json                  ← tous les métadonnées
├── Maths/
│   ├── CM/
│   │   └── cours_1.pdf
│   └── TD/
│       └── td_1.pdf
└── Algo/
    └── TP/
        └── tp_4.docx
```

Import depuis un vieux `.json` reste supporté (sans fichiers, mais ça marche).

---

## Tests

```bash
http://localhost:8080/test.html
```

Les tests roulent sur des clés séparées (`_test_*`) — tes données réelles ne sont jamais touchées.

**Couverts :**
- Création matière, catégories, items
- Attachement fichier + MIME/taille préservés
- Export ZIP : structure arborescence
- Clear → Import → données restaurées
- Suppression item : fichier disparu de IndexedDB
- Re-export : fichier supprimé n'apparaît plus

---

## Roadmap

- [ ] **Sync multi-appareils** — Google Drive comme backend (study en cours)
- [ ] PWA / mode hors ligne amélioré
- [ ] Statistiques (graphiques, historique)
- [ ] Rappels
- [ ] Mode sombre

---

## Licence

Usage personnel. Projet étudiant en développement.
