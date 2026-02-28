# Elden Ring Watcher

Outil Windows qui détecte automatiquement les combats de boss dans Elden Ring et envoie les événements à un serveur Discord (morts, kills, temps de combat).

Fonctionne en arrière-plan dans le system tray — aucune interaction requise pendant le jeu.

## Fonctionnalités

- **Détection des morts** — template matching sur "VOUS AVEZ PÉRI" (<1ms)
- **Détection des kills** — template matching sur "ENNEMI ABATTU" / "DEMI-DIEU ABATTU"
- **Identification des boss** — OCR Tesseract + fuzzy matching sur 168+ noms français
- **System tray** — icône avec statut (pas de jeu / en jeu / combat de boss)
- **Auto-update** — vérification automatique des nouvelles versions au lancement
- **File d'attente offline** — les événements sont sauvegardés si le serveur est injoignable

## Installation

### Méthode simple (recommandée)

1. Télécharger `EldenWatcher.exe` depuis la [dernière release](https://github.com/bledardo/eldenring-bot/releases/latest)
2. Installer [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (cocher "French" dans les langues)
3. Lancer `EldenWatcher.exe`
4. Configurer `%USERPROFILE%\.elden-watcher\config.toml` :

```toml
api_url = "https://votre-serveur.com/api"
api_key = "votre-clé"
```

### Depuis les sources

```bash
git clone https://github.com/bledardo/eldenring-bot.git
cd eldenring-bot
pip install -r requirements.txt
python -m watcher.main
```

## Configuration

Le fichier de config est créé automatiquement au premier lancement dans `~/.elden-watcher/config.toml` :

| Paramètre              | Défaut             | Description                          |
|------------------------|--------------------|--------------------------------------|
| `api_url`              | `""`               | URL du serveur d'événements          |
| `api_key`              | `""`               | Clé d'API                            |
| `capture_fps`          | `10`               | Images par seconde analysées         |
| `game_process`         | `eldenring.exe`    | Nom du processus du jeu              |
| `debug_screenshots`    | `false`            | Sauvegarder les screenshots de debug |
| `log_level`            | `INFO`             | Niveau de log (DEBUG, INFO, etc.)    |

## Build

Pour compiler l'exe depuis les sources (Windows uniquement) :

```powershell
pip install -r requirements.txt
pip install pyinstaller
python build.py
# -> dist/EldenWatcher.exe
```

Ou utiliser le script de build rapide : `.\rebuild.ps1`

## Stack technique

- **Python 3.11+**
- **BetterCam** — capture d'écran GPU rapide
- **OpenCV** — template matching pour morts/kills
- **Tesseract OCR** — lecture des noms de boss
- **pystray** — icône system tray
- **transitions** — machine à états (idle → boss fight → résolution)

## Licence

MIT
