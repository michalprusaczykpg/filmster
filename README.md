# FILMSTER — Kocham Agę ❤️

Rodzinna gra muzyczna na osi czasu, działająca jako PWA na iPhone i komputerze.

## Co działa

- 242 utwory: polskie, filmowe, taneczne i romantyczne dla Agi;
- odliczanie 3–2–1, czas na odpowiedź i pauza;
- osobne osie czasu dla graczy i punkty;
- otwieranie wyszukiwania utworu w Spotify (DJ uruchamia muzykę);
- zapamiętywanie ustawień lokalnie i działanie samej gry offline po pierwszym uruchomieniu.

**Uwaga:** nie jest to integracja z odtwarzaczem Spotify ani losowanie z całej biblioteki Spotify. Odtwarzanie nagrań wymaga Spotify i połączenia z internetem.

## GitHub Pages

1. Utwórz **publiczne** repozytorium `filmster`, z gałęzią `main`.
2. Wgraj pliki z katalogu `FILMSTER_PWA` do **głównego katalogu** repozytorium (nie do dodatkowego podfolderu).
3. GitHub → repozytorium → **Settings → Pages** → **Source: Deploy from a branch** → `main` → `/(root)` → Save.
4. Witryna otrzyma adres w formacie `https://TWOJ-LOGIN.github.io/filmster/`, jeśli nazwa repozytorium to `filmster`.
5. Na iPhonie otwórz adres w Safari → Udostępnij → Dodaj do ekranu początkowego → „Otwórz jako aplikację” → Dodaj.

Repozytorium musi być opublikowane przez HTTPS, żeby działał service worker PWA. Wersja plikowa (`file://`) nie uruchamia service workera.