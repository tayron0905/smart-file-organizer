# Smart File Organizer

Smart File Organizer ist eine lokale Desktop-App für Linux. Sie zeigt Dateien eines ausgewählten Ordners mit Speicherübersicht, Dateivorschau und automatischer Sortierung.

## Funktionen

- Ordner auswählen und Dateien darin durchsuchen
- Bilder, Video, Audio, Text und Code direkt in der Seitenleiste voranzeigen
- Dateitypen automatisch erkennen
- Dateien nach Typ, Änderungsdatum oder Dateinamen-Projekt sortieren
- Dateien automatisch in Kategorie-, Monats- oder Projektordner verschieben
- Dateien per Drag & Drop verschieben oder von außen in den geöffneten Ordner ziehen
- Raster- und Listenansicht, Suche und Details
- Dateien bleiben lokal auf deinem Gerät

## Entwicklung

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev
```

## Linux installieren

Pakete lokal erzeugen:

```bash
npm install
npm run dist:linux
```

Danach liegen `Smart File Organizer-1.0.0.AppImage` und das Debian-Paket unter `release/`. Das AppImage ausführbar machen und starten:

```bash
chmod +x "release/Smart File Organizer-1.0.0.AppImage"
"release/Smart File Organizer-1.0.0.AppImage"
```

Auf Debian- und Ubuntu-Systemen kann das `.deb` mit dem Paketmanager installiert werden:

```bash
sudo apt install ./release/smart-file-organizer_1.0.0_amd64.deb
```

## Sicherheit

Die Oberfläche erhält keinen direkten Dateisystemzugriff. Sie kommuniziert über eine begrenzte Electron-Preload-API mit dem Hauptprozess. Es gibt keine Anmeldung und keinen Cloud-Dienst.
