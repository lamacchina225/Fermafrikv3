# Android installation

Cette application peut etre embarquee dans une APK Android via Capacitor.

## 1. Installer les dependances

```bash
npm install
```

## 2. Definir l'URL de l'application web

Capacitor pointe vers l'application privee de la ferme via la variable `CAPACITOR_SERVER_URL`.

Exemple :

```bash
export CAPACITOR_SERVER_URL="https://votre-instance-fermafrik.example.com"
```

## 3. Initialiser Android

```bash
npm run android:add
```

## 4. Synchroniser les ressources

```bash
npm run android:sync
```

## 5. Ouvrir le projet natif

```bash
npm run android:open
```

Dans Android Studio :

1. laisser Gradle terminer la synchronisation
2. choisir `Build > Build Bundle(s) / APK(s) > Build APK(s)`
3. recuperer l'APK genere pour installation sur le telephone de la ferme

## Notes

- Si l'application web est servie en HTTP local, Capacitor autorise le `cleartext`.
- Le mode hors ligne reste assure par le service worker de l'application web.
- Les notifications integrees actuelles sont des notifications web locales basees sur les indicateurs du tableau de bord.
- Sans `CAPACITOR_SERVER_URL`, l'application Android ouvre un shell d'attente qui rappelle la configuration a faire.
