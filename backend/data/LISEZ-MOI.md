# Le catalogue

Ce dossier contient les données du site. **C'est le cœur du projet** : l'interface,
les scores et les comparaisons ne valent que ce que valent ces fichiers.

Une seule porte d'entrée vers la base : `scripts/import.js`. Que la donnée vienne
d'un clavier ou d'un agent, elle subit les mêmes contrôles.

```bash
node scripts/import.js data/cpus.json                      # montre le diff, n'écrit rien
node scripts/import.js data/cpus.json --verifier           # + contrôle chaque source en ligne
node scripts/import.js data/cpus.json --verifier --ecrire  # applique
node scripts/import.js data/cpus.json --coherence=2         # signalement plus sensible
```

---

## 1. Le format

```json
{
  "type": "cpus",
  "produits": [
    {
      "name": "Intel Core i9-14900K",
      "brand": "Intel",
      "cores": 24,
      "geekbench_multi": 23500,
      "provenance": {
        "cores": {
          "url": "https://…",
          "releve_le": "2026-08-20",
          "extrait": "24 cores (8 P-cores + 16 E-cores)"
        },
        "geekbench_multi": {
          "url": "https://…",
          "releve_le": "2026-08-20",
          "extrait": "Multi-Core Score 23500"
        }
      }
    }
  ]
}
```

`type` vaut `cpus`, `gpus`, `laptops` ou `telephones`. Les champs disponibles sont
ceux du modèle correspondant dans `backend/models/`.

**Chaque mesure chiffrée doit avoir son entrée dans `provenance`** — l'URL où on
l'a lue, la date, et l'extrait de la ligne qui la porte. Les trois sont
obligatoires. Une mesure sans source est refusée : **un nombre tiré de nulle
part n'a pas d'URL**.

**Et la valeur doit figurer dans son propre extrait.** C'est ce qui rattache un
nombre à son libellé. `91` peut se trouver quelque part sur une page ; il ne
peut pas se trouver dans `"Total Cores 24"`. Ce contrôle ne coûte aucune
requête — il se fait sur le fichier seul.

Les champs qui ne sont pas des mesures — `name`, `brand`, `imageUrl`, `pros`,
`cons` — n'en demandent pas. Une valeur laissée à `null` non plus : elle
n'affirme rien, elle n'a rien à prouver.

---

## 2. Les six gardes

| | Garde | Coût | Ce qu'il attrape |
| --- | --- | --- | --- |
| 1 | Provenance obligatoire + valeur ⊂ extrait | nul | Le chiffre sorti de nulle part, **et le nombre rattaché au mauvais libellé** |
| 2 | Champs connus du modèle | nul | La donnée que Mongoose jetterait en silence |
| 3 | Plages de validité | nul | La faute de frappe (« 570 GHz ») |
| 4 | Extrait retrouvé sur la page (`--verifier`) | une requête par source | Le chiffre plausible mais faux |
| 5 | Quarantaine des écarts | nul | La collecte qui a dérapé |
| 6 | Cohérence du lot | nul | La valeur qui détonne parmi ses voisines |

**Les gardes 1 et 4 forment une chaîne** : `valeur ⊂ extrait ⊂ page`.

Le garde 1 vérifie, gratuitement, que la valeur est dans l'extrait annoncé. Le
garde 4 télécharge la page et vérifie que l'extrait s'y trouve mot pour mot.
Ensemble, ils interdisent le contresens : un nombre ne peut plus être rattaché
au mauvais libellé.

C'est ce qui distingue une transcription d'une invention. Une IA qui restitue un
benchmark de mémoire produit un nombre crédible ; elle ne produit pas une page
qui contient la ligne où il figurerait.

La comparaison accepte les graphies usuelles d'un même nombre — `23500`,
`23,500`, `23 500`, `23.500`, et `6,0` pour la valeur `6` — et rien d'autre. Le
nombre doit être isolé : `235009` ne valide pas `23500`.

**D'où l'exigence d'un extrait court et précis.** `"Total Cores 24"` fait toute
la démonstration. Une page entière recopiée contiendrait n'importe quel nombre
et viderait le garde 1 de son sens.

**Le garde 5** met en attente toute mesure déjà en base qui bouge de plus de
10 %. Un processeur ne change pas de performance pendant la nuit : si le chiffre
bouge, c'est le relevé qui a dérapé. Seuil ajustable par `--seuil=25`.

**Le garde 6** compare chaque valeur à la médiane du fichier et signale ce qui
s'en écarte de plus d'un facteur 4. C'est le seul qui regarde les produits
*ensemble* : un `cores: 91` au milieu de 24, 20, 16 et 8 ne viole aucune règle
prise isolément, mais il détonne. Réglable par `--coherence=2`.

Il **signale sans jamais bloquer** — certains champs s'étalent légitimement sur
un facteur dix, le stockage d'un portable allant de 256 Go à 4 To. Il devient
indispensable dès que la collecte est répartie entre plusieurs agents : chacun
ne voit qu'un produit, donc aucun ne peut voir l'anomalie.

Il lui faut au moins **cinq relevés** sur un champ pour se prononcer : en
dessous, un écart n'est pas une anomalie, c'est un échantillon.

---

## 3. Écriture

Le rapprochement avec l'existant se fait sur **`name` + `brand`**, casse et
espaces ignorés. Un produit déjà présent est mis à jour, jamais dupliqué —
relancer un import deux fois est sans effet la seconde fois.

**Le slug n'est jamais recalculé sur une fiche existante.** Une adresse qui
changerait à chaque correction ne vaudrait pas mieux que l'identifiant Mongo
qu'elle remplace.

---

## 4. Confier la collecte à un agent

La consigne complète est dans **[`CONSIGNE-AGENT.md`](CONSIGNE-AGENT.md)** —
texte autonome, à transmettre tel quel. Il contient le format, la liste des
champs par catégorie, les sources vérifiées et les pièges connus.

Ne recopiez pas ces règles ailleurs : deux versions d'une consigne finissent
toujours par diverger, et c'est celle qu'on ne relit pas qui sert.

**Cadence.** Une fois par semaine suffit, et une exécution à la demande quand un
produit sort. Un passage quotidien, c'est 365 occasions par an d'abîmer le
catalogue pour presque aucune information nouvelle — et un score qui change tout
seul le matin détruit plus de confiance qu'une case vide.

**Relecture.** La sortie d'un agent se relit avant `--ecrire`, dans le diff. Le
mode par défaut ne touche à rien : c'est délibéré.

**Le piège que les contrôles ne voient pas** : confondre la note d'un site
comparatif avec une mesure. « Multi-Core Performance 91 » n'est pas un nombre de
cœurs ni un score Geekbench — et 91 passait tous les gardes sans broncher.
C'est le premier avertissement de la consigne, gardez-le en tête en relisant.

---

## 5. Fichiers

| Fichier | Rôle |
| --- | --- |
| `cpus.json`, `gpus.json`… | Le catalogue, versionné avec le code |
| `demonstration.json` | Montre les gardes en action. **Ne jamais l'importer** — ses URL pointent sur `exemple.invalid`, réservé aux exemples |

---

## 6. Avant d'automatiser

Deux points à régler une fois pour toutes :

1. **Les conditions d'utilisation des sources.** Une page publique n'autorise
   pas la collecte automatisée. Wikipédia est en CC BY-SA et impose une
   attribution visible ; les agrégateurs de benchmarks encadrent ou interdisent
   la reprise en masse. Le site est en ligne publiquement : ce n'est pas un
   détail à traiter après coup.

2. **Un noyau rempli à la main d'abord.** Quarante fiches vérifiées par vous,
   par catégorie, ne sont pas seulement des données : c'est **le jeu d'épreuve**
   qui vous dira si l'agent transcrit ou s'il brode. Sans référence, sa
   production est invérifiable — vous reliriez des chiffres plausibles en vous
   demandant indéfiniment s'ils sont vrais.
