# Proposition : le format d'une mesure

> **Statut : décidé le 30 octobre 2026. Phase 1 implémentée** (champs facultatifs, contrôlés s'ils sont présents) ; phases 2 et 3 à venir. Les cinq décisions sont en section 6, les phases en section 5.
>
> Rédigé le 30 octobre 2026, à partir du code réel (`shared/criteres.js`, `backend/models/catalogue.js`, `shared/provenance.js`) et de l'étude stratégique.

---

## 1. Pourquoi décider maintenant

Le catalogue actuel (53 fiches) est un catalogue de test qui sera remplacé. C'est le moment le moins cher pour fixer le format : après l'import d'un vrai catalogue, chaque champ ajouté devra être rempli sur des centaines de fiches, ou rester vide pour toujours.

Ce qu'une mesure doit permettre de répondre, du point de vue d'un visiteur :

1. **D'où vient ce chiffre ?** C'est déjà couvert : URL, date, extrait.
2. **Qui l'a produit ?** Le constructeur qui l'annonce, un laboratoire qui l'a mesuré, ou un site qui agrège des résultats d'utilisateurs.
3. **Avec quel test, dans quelle version ?** « 3DMark » n'est pas un test. Time Spy, Time Spy Extreme et Steel Nomad donnent des scores sans rapport entre eux, et même au sein de Time Spy, le score graphique et le score global diffèrent.
4. **Ces deux chiffres se comparent-ils ?** Seulement si les réponses à la question 3 sont les mêmes.

## 2. Ce qui existe aujourd'hui

Une mesure est un nombre posé directement sur la fiche, et sa source vit à côté, dans `provenance`, indexée par le nom du champ :

```json
{
  "name": "GeForce RTX 4090",
  "benchmark_3dmark": 36309,
  "provenance": {
    "benchmark_3dmark": {
      "url": "https://nanoreview.net/…",
      "releve_le": "2026-08-20",
      "extrait": "Time Spy 36309"
    }
  }
}
```

La **nature** d'une mesure (`benchmark`, `mesure`, `caracteristique`) est déclarée **par critère** dans `shared/criteres.js`, pas par valeur.

**Ce qui marche bien, et qu'il faut garder** :

- la valeur reste un simple nombre sur la fiche : tris MongoDB, formules, résumé du marché et affichage la lisent sans détour ;
- l'extrait prouve la valeur, et le serveur le vérifie à chaque écriture ;
- une source par mesure, et non par fiche.

**Ce qui manque** (constaté dans les données de production) :

| Manque                                      | Exemple réel                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Le test exact n'est noté nulle part         | Les 15 GPU portent « Time Spy NNNNN ». Probablement le score graphique, mais rien ne le dit, et une fiche relevée en Time Spy Extreme passerait tous les contrôles.                                                                                                 |
| La version du test non plus                 | `geekbench_multi` suppose Geekbench 6. Un score Geekbench 5 (échelle différente) passerait tous les contrôles.                                                                                                                                                      |
| L'origine est fixée par critère, pas valeur | `battery_life_hours` est déclaré `mesure`, et les 8 laptops portent bien une mesure Notebookcheck (test Wi-Fi). L'interface l'étiquette pourtant « Autonomie annoncée ». Le jour où une fiche porte une autonomie constructeur, rien ne permettra de la distinguer. |
| Une seule source par valeur                 | Deux sites qui donnent 13 611 et 14 020 pour le même portable : on garde l'un, l'autre disparaît sans trace.                                                                                                                                                        |
| La page source peut changer ou disparaître  | Aucune copie archivée : dans un an, l'URL ne prouvera plus rien.                                                                                                                                                                                                    |

## 3. Trois options

### Option A — Enrichir l'entrée de provenance (recommandée)

La valeur reste un nombre sur la fiche. L'entrée de `provenance` gagne quelques champs :

```json
"benchmark_3dmark": {
  "url": "https://nanoreview.net/…",
  "releve_le": "2026-08-20",
  "extrait": "Time Spy Graphics 36309",
  "origine": "agregat",
  "protocole": "3dmark-time-spy-graphics",
  "version": "1.2",
  "archive": "https://web.archive.org/web/2026…/https://nanoreview.net/…"
}
```

- **Pour** : aucun chemin de lecture ne change (tris, formules, marché, affichage) ; ajout pur, donc migration progressive ; l'entrée de provenance est déjà, de fait, la fiche d'une mesure.
- **Contre** : une seule source par valeur. Plusieurs sources resteraient possibles plus tard (option C) sans tout casser.

### Option B — La mesure devient un sous-document

```json
"benchmark_3dmark": { "valeur": 36309, "url": "…", "protocole": "…" }
```

- **Pour** : la valeur et sa preuve ne peuvent plus être séparées.
- **Contre** : casse **tous** les lecteurs. Les tris `sort({ benchmark_3dmark: -1 })` de `/api/featured`, `shared/formules.js`, `shared/marche.js`, `specs.js`, le radar, le formulaire admin, l'IA, `import.js`, et la tolérance aux anciennes valeurs texte de `catalogue.js`. Beaucoup de travail pour un bénéfice que l'option A apporte presque entièrement, puisque le serveur vérifie déjà que valeur et extrait concordent.

### Option C — Une collection `mesures` séparée

Un document par relevé (produit, critère, valeur, source, protocole…), plusieurs relevés possibles par critère. La fiche garde la valeur **retenue**, comme aujourd'hui.

- **Pour** : historique complet, plusieurs sources, détection des écarts entre sites, et de quoi calculer une médiane si on le souhaite un jour.
- **Contre** : il faut une règle pour choisir la valeur retenue, une seconde collection à synchroniser, et une interface admin à refaire. C'est prématuré pour un catalogue de quelques dizaines de fiches entretenu par une seule personne.

**Recommandation** : l'option A maintenant. Ses champs sont choisis pour qu'une entrée de provenance puisse devenir, telle quelle, un document de la collection `mesures` si l'option C devient nécessaire.

## 4. Détail de l'option A

### 4.1 Les champs

| Champ       | Obligatoire           | Valeurs                                  | Rôle                                                                          |
| ----------- | --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `url`       | oui (déjà)            | URL                                      | Page d'où vient la valeur                                                     |
| `releve_le` | oui (déjà)            | date                                     | Date du relevé                                                                |
| `extrait`   | oui (déjà)            | texte                                    | Phrase de la page qui contient la valeur                                      |
| `origine`   | oui                   | `constructeur`, `laboratoire`, `agregat` | Qui a produit le chiffre                                                      |
| `protocole` | oui pour un benchmark | identifiant d'une liste fermée (4.2)     | Test exact. C'est lui qui décide si deux valeurs se comparent                 |
| `version`   | non (Q2)              | texte libre (« 6.3 », « 1.2 »)           | Sous-version, si la source la donne ; la version majeure est dans `protocole` |
| `archive`   | non (Q4)              | URL (archive.org, archive.today)         | Copie figée de la page, pour que la preuve survive à la source                |

**Pourquoi `origine` et pas `nature`** : `nature` existe déjà dans `shared/criteres.js` et répond à une autre question, « qu'est-ce que ce critère » (un benchmark, une mesure de laboratoire, une caractéristique). `origine` répond à « qui a produit **cette** valeur ». Les deux se croisent : une autonomie (critère de nature `mesure`) peut avoir une origine `constructeur` (« jusqu'à 20 h ») ou `laboratoire` (Notebookcheck, test Wi-Fi). C'est exactement le cas de l'étiquette « Autonomie annoncée » erronée.

### 4.2 Les protocoles sont déclarés, pas saisis

Chaque critère de `shared/criteres.js` déclarerait les protocoles qu'il accepte :

```js
c('benchmark_3dmark', { nature: 'benchmark', plafond: 35000, protocoles: ['3dmark-time-spy-graphics'] }),
c('battery_life_hours', { nature: 'mesure', unite: 'h', plafond: 20, protocoles: ['notebookcheck-wifi', 'constructeur'] }),
```

Le contrôle d'écriture refuserait un protocole absent de la liste. Pour accepter un nouveau test, il faut une ligne dans `criteres.js`, donc une décision explicite, et pas une faute de frappe dans un formulaire.

**Les caractéristiques** (cœurs, Go, fréquences) n'ont pas de protocole : `origine: "constructeur"` suffit.

### 4.3 Règles de comparaison

C'est le point qui change le comportement du site, et la vraie raison de ce travail :

1. Deux valeurs d'un même critère ne se comparent (gagnant, écart, rang) **que si elles ont le même protocole**.
2. Une note sur 100 n'est calculée qu'à partir du protocole de référence du critère : le premier de la liste `protocoles`.
3. Une valeur d'un autre protocole s'affiche, avec sa source, mais sans gagnant ni rang, comme les unités de calcul GPU aujourd'hui (`comparable: false`).
4. Le résumé du marché (`/marche`) ne compte que les valeurs du protocole de référence.
5. L'étiquette affichée dépend de l'origine : « annoncée » pour `constructeur`, « mesurée » pour `laboratoire`, « relevés d'utilisateurs » pour `agregat`.

## 5. Migration

| Phase                              | Ce qui change                                                                                                                                                   | Fiches existantes                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Champs facultatifs              | Schéma, `criteres.js` (protocoles), contrôles, formulaire admin, affichage de l'origine. Les nouveaux champs sont acceptés et vérifiés **s'ils sont présents**. | Inchangées, toujours modifiables                                         |
| 2. Obligatoires pour les nouvelles | `import.js` et l'API exigent `origine` (et `protocole` pour un benchmark) sur toute mesure **nouvelle ou modifiée**.                                            | Inchangées tant qu'on n'y touche pas                                     |
| 3. Obligatoires partout            | Une fiche sans ces champs est refusée. Les règles de comparaison de 4.3 s'appliquent.                                                                           | Le catalogue de test a été remplacé entre-temps (section 10 du contexte) |

**Pas de rétro-remplissage automatique.** Déduire `protocole: "3dmark-time-spy-graphics"` de l'extrait « Time Spy 36309 » serait affirmer ce que la source ne dit pas. Les fiches de test restent sans protocole jusqu'à leur remplacement. Elles s'affichent normalement en phase 1 et 2, et sont remplacées avant la phase 3.

## 6. Décisions (30 octobre 2026)

| Question                               | Décision                                                                                                                                            | Écartée, et pourquoi                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Q1.** Option A, B ou C ?             | **A** : enrichir l'entrée de provenance.                                                                                                            | B réécrit tous les lecteurs pour un gain marginal ; C est prématurée à cette taille de catalogue.  |
| **Q2.** Version du test obligatoire ?  | **Non.** La version majeure fait partie du protocole (`geekbench-6`, pas `geekbench`) ; `version` reste facultative.                                | L'exiger bloquerait des données valables : beaucoup de sources ne donnent pas la sous-version.     |
| **Q3.** Valeur d'un autre protocole ?  | **Affichée avec sa source, sans gagnant, rang ni note** (4.3, règle 3).                                                                             | La refuser ferait perdre des données réelles.                                                      |
| **Q4.** Archive obligatoire ?          | **Non pour l'instant.** À ajouter automatiquement par `import.js --verifier`, qui télécharge déjà la page.                                          | Une archive obligatoire à la main imposerait un appel réseau par source, sans outil pour le faire. |
| **Q5.** Plusieurs sources par valeur ? | **Non pour l'instant.** À reconsidérer au-delà de quelques centaines de fiches, ou si des écarts entre sites apparaissent régulièrement (option C). | —                                                                                                  |

## 7. Fichiers touchés

Pour estimer l'effort. Aucun n'est modifié par ce document.

| Fichier                                                                    | Changement                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `shared/criteres.js`                                                       | Liste `protocoles` par critère                                                      |
| `shared/provenance.js`                                                     | Contrôle de `origine`, `protocole` (liste fermée), `archive` (URL)                  |
| `backend/models/catalogue.js`                                              | Nouveaux champs du sous-schéma de provenance                                        |
| `backend/scripts/import.js`, `data/LISEZ-MOI.md`, `data/CONSIGNE-AGENT.md` | Format d'import documenté et exigé                                                  |
| `shared/formules.js`, `shared/marche.js`                                   | Ne compter que le protocole de référence                                            |
| `frontend/src/utils/specs.js`, `marche.js`                                 | Comparabilité par protocole ; étiquette « annoncée » ou « mesurée » selon l'origine |
| `frontend/src/components/marche/SourcesMarche.jsx`                         | Afficher origine, protocole, version, lien d'archive                                |
| `frontend/src/pages/AdminPage.jsx`                                         | Deux listes déroulantes (origine, protocole) et deux champs (version, archive)      |
| Tests `shared/`, `backend/`, `frontend/`                                   | Nouveaux cas, dont « deux protocoles différents ne donnent pas de gagnant »         |
