# Elden Ring Watcher

Outil Windows qui detecte automatiquement les combats de boss dans Elden Ring et envoie les evenements a un serveur Discord (morts, kills, temps de combat).

Fonctionne en arriere-plan dans le system tray — aucune interaction requise pendant le jeu.

## Fonctionnalites

- **Detection des morts** — template matching sur "VOUS AVEZ PERI" (<1ms)
- **Detection des kills** — template matching sur "ENNEMI ABATTU" / "DEMI-DIEU ABATTU"
- **Identification des boss** — OCR Tesseract + fuzzy matching sur 168+ noms francais
- **System tray** — icone avec statut (pas de jeu / en jeu / combat de boss)
- **Auto-update** — verification automatique des nouvelles versions au lancement
- **File d'attente offline** — les evenements sont sauvegardes si le serveur est injoignable

## Installation

### Methode simple (recommandee)

1. Telecharger `EldenWatcher.exe` depuis la [derniere release](https://github.com/bledardo/eldenring-bot/releases/latest)
2. Installer [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (cocher "French" dans les langues)
3. Lancer `EldenWatcher.exe`
4. Configurer `%USERPROFILE%\.elden-watcher\config.toml` :

```toml
api_url = "https://votre-serveur.com/api"
api_key = "votre-cle"
```

### Depuis les sources

```bash
git clone https://github.com/bledardo/eldenring-bot.git
cd eldenring-bot
pip install -r requirements.txt
python -m watcher.main
```

## Configuration

Le fichier de config est cree automatiquement au premier lancement dans `~/.elden-watcher/config.toml` :

| Parametre              | Default            | Description                        |
|------------------------|--------------------|------------------------------------|
| `api_url`              | `""`               | URL du serveur d'evenements        |
| `api_key`              | `""`               | Cle d'API                          |
| `capture_fps`          | `10`               | Images par seconde analysees       |
| `game_process`         | `eldenring.exe`    | Nom du processus du jeu            |
| `debug_screenshots`    | `false`            | Sauvegarder les screenshots de debug |
| `log_level`            | `INFO`             | Niveau de log (DEBUG, INFO, etc.)  |

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
- **BetterCam** — capture d'ecran GPU rapide
- **OpenCV** — template matching pour morts/kills
- **Tesseract OCR** — lecture des noms de boss
- **pystray** — icone system tray
- **transitions** — machine a etats (idle → boss fight → resolution)

## Licence

MIT
