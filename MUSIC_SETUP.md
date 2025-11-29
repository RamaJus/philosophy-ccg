# 🎵 Hintergrundmusik Setup

## Schritt 1: Audio-Datei hinzufügen

1. Erstelle einen Ordner `music` im `public/` Verzeichnis:
   ```
   philosophy-ccg/
   └── public/
       └── music/           👈 Neuer Ordner
           └── background.mp3   👈 Deine Audio-Datei
   ```

2. Benenne deine Audio-Datei als **`background.mp3`** (oder `.ogg`)
   - Oder: Passe den Pfad in `App.tsx` an (siehe unten)

## Schritt 2: Pfad anpassen (optional)

Falls deine Datei anders heißt, ändere in `src/App.tsx`:

```tsx
<BackgroundMusic volume={0.5} audioFile="/music/deine-datei.mp3" />
```

## Features

✅ **Automatischer Loop** - Musik wiederholt sich endlos  
✅ **50% Lautstärke** - Angenehme Hintergrundlautstärke  
✅ **Mute-Button** - Oben rechts zum Ein-/Ausschalten  
✅ **Browser-Kompatibel** - Funktioniert auf Vercel

## Wichtig: Browser Autoplay

- Moderne Browser blockieren Autoplay bis zur ersten Nutzer-Interaktion
- Die Musik startet automatisch, sobald der Nutzer auf einen Button klickt
- Falls sie nicht automatisch startet, auf den 🔊 Button oben rechts klicken

## Deployment

Nach dem Hinzufügen der Audio-Datei:
```bash
git add public/music/
git commit -m "Add background music"
git push
```

Die Musik läuft dann auch auf Vercel! 🎉
