# FILMSTER 🎵❤️ — Kocham Agę

Rodzinna gra w układanie piosenek i muzyki filmowej na osi czasu. PWA: można dodać do ekranu głównego iPhone'a. Interfejs i mechanika gry działają offline po pierwszym wczytaniu; Spotify wymaga internetu i konta Spotify.

## Zagraj

https://michalprusaczykpg.github.io/filmster/

W Safari: **Udostępnij → Dodaj do ekranu początkowego**. Aby pobrać aktualizacje, zamknij i otwórz aplikację lub odśwież stronę w Safari.

## Spotify — odtwarzanie muzyki

Domyślny tryb ręczny: kliknij **Wyszukaj w Spotify**, DJ wybiera piosenkę i wraca do FILMSTER. Spotify powinno kontynuować odtwarzanie w tle, ale zależy to od ustawień iOS i odtwarzacza.

Dla automatycznego uruchamiania piosenek z poziomu FILMSTER:

1. Potrzebne jest konto Spotify Premium oraz dostęp do Spotify Developer Dashboard: https://developer.spotify.com/dashboard
2. Utwórz aplikację w Spotify Developer Dashboard i podaj w konfiguracji aplikacji dokładny Redirect URI: `https://michalprusaczykpg.github.io/filmster/` (z ukośnikiem na końcu).
3. W Spotify Developer Dashboard skopiuj **Client ID**, **nie Client Secret**. Wklej Client ID w **Połącz Spotify Premium** na ekranie gry, najlepiej w Safari (nie w oknie podglądu innej aplikacji).
4. Zaloguj się na Spotify, wyraź zgodę na dostęp do odtwarzacza.
5. Uruchom Spotify na iPhonie/komputerze i odtwórz dowolną piosenkę, aby urządzenie było widoczne w Spotify Connect. Wróć do FILMSTER.
6. Naciśnij **3 · 2 · 1 · START!** — gra wyszuka utwór, spróbuje włączyć go na aktywnym urządzeniu i uruchomi odliczanie.

**Ważne:** Spotify ma limity dla aplikacji w trybie developerskim (m.in. maksymalnie 5 użytkowników na aplikację). Każde konto testera musi być dopisane do allowlisty w Spotify Developer Dashboard. Wyszukiwanie i odtwarzanie może się nie udać dla konkretnych utworów lub urządzeń. W takiej sytuacji użyj ręcznego odnośnika.

Spotify udostępnia odtwarzanie przez Web API tylko użytkownikom Premium. Autor FILMSTER nie ma dostępu do danych logowania użytkownika — wykorzystywany jest bezpieczny OAuth 2.0 Authorization Code + PKCE. Nie publikuj Client Secret w publicznym repozytorium.

## Dźwięk

Na ekranie ustawień kliknij **🔊 Sprawdź dźwięk odliczania**. Dźwięki 3–2–1 generuje lokalnie przeglądarka, nie są nagraniami muzycznymi. Na iPhonie zwiększ głośność multimediów. Dźwięk piosenki pochodzi wyłącznie ze Spotify — nie jest odtwarzany przez stronę FILMSTER.

## Publikacja

Projekt statyczny, bez serwera. GitHub Pages: `Settings → Pages → Deploy from a branch → main / (root)`. Manifest: `manifest.webmanifest`; service worker: `sw.js`.

FILMSTER nie jest powiązany z marką Hitster ani ze Spotify.