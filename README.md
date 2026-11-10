# FILMSTER 🎵❤️ — Kocham Agę

Rodzinna gra w układanie piosenek i muzyki filmowej na osi czasu. PWA: można dodać do ekranu głównego iPhone'a. Interfejs i mechanika gry działają offline po pierwszym wczytaniu; Spotify wymaga internetu i konta Spotify.

## Zagraj

https://michalprusaczykpg.github.io/filmster/

W Safari: **Udostępnij → Dodaj do ekranu początkowego**. Aby pobrać aktualizacje, zamknij i otwórz aplikację lub odśwież stronę w Safari.

## Spotify — odtwarzanie muzyki

Na ekranie startowym wybierz **Spotify Free** (ręczne odtwarzanie) albo **Spotify Premium** (możliwe sterowanie Spotify Connect po połączeniu konta). W trybie Free kliknij **Otwórz piosenkę w Spotify Free**, a DJ wybiera piosenkę i wraca do FILMSTER. Spotify powinno kontynuować odtwarzanie w tle, ale zależy to od ustawień iOS i odtwarzacza.

Dla automatycznego uruchamiania piosenek z poziomu FILMSTER:

1. Potrzebne jest konto Spotify Premium oraz dostęp do Spotify Developer Dashboard: https://developer.spotify.com/dashboard
2. Utwórz aplikację w Spotify Developer Dashboard i podaj w konfiguracji aplikacji dokładny Redirect URI: `https://michalprusaczykpg.github.io/filmster/` (z ukośnikiem na końcu).
3. W Spotify Developer Dashboard skopiuj **Client ID**, **nie Client Secret**. Wklej Client ID w **Połącz Spotify Premium** na ekranie gry, najlepiej w Safari (nie w oknie podglądu innej aplikacji).
4. Zaloguj się na Spotify, wyraź zgodę na dostęp do odtwarzacza.
5. Uruchom Spotify na iPhonie/komputerze i odtwórz dowolną piosenkę, aby urządzenie było widoczne w Spotify Connect. Wróć do FILMSTER.
6. Naciśnij **3 · 2 · 1 · START!** — gra wyszuka utwór, spróbuje włączyć go na aktywnym urządzeniu i uruchomi odliczanie.

**Ważne:** Spotify ma limity dla aplikacji w trybie developerskim (m.in. maksymalnie 5 użytkowników na aplikację). Każde konto testera musi być dopisane do allowlisty w Spotify Developer Dashboard. Wyszukiwanie i odtwarzanie może się nie udać dla konkretnych utworów lub urządzeń. W takiej sytuacji użyj ręcznego odnośnika.

Spotify udostępnia odtwarzanie przez Web API tylko użytkownikom Premium. Autor FILMSTER nie ma dostępu do danych logowania użytkownika — wykorzystywany jest bezpieczny OAuth 2.0 Authorization Code + PKCE. Nie publikuj Client Secret w publicznym repozytorium.

## Aktywacja Spotify jeden raz

Po połączeniu konta Premium, odtwórz dowolny utwór w Spotify i wróć do FILMSTER. Na ekranie rundy możesz kliknąć **🔊 Aktywuj Spotify tylko raz**. Gra zapamięta wybrane urządzenie. W kolejnych rundach przycisk **START + Spotify** automatycznie spróbuje zagrać wylosowany utwór bez ręcznego przechodzenia do Spotify. Wyszukiwanie utworu rozpoczyna się już po przygotowaniu nowej rundy. W przypadku utraty aktywnego urządzenia API ponawia próbę i odświeża dostępne urządzenia.

**Ograniczenie Spotify/iOS:** zaakceptowanie polecenia przez Spotify Web API nie gwarantuje, że iPhone odtwarza dźwięk. Jeśli aplikacja Spotify stanie się niedostępna jako odtwarzacz Connect po przełączeniu do Safari/PWA, może pojawić się HTTP 404 i trzeba ponownie otworzyć Spotify. Nie ma niezawodnego sposobu, by strona statyczna GitHub Pages wymusiła utrzymywanie procesu Spotify w tle na iPhonie. Tryb ręczny pozostaje dostępny przez osobny przycisk otwierający dokładnie wylosowany utwór.

## Dźwięk

Na ekranie ustawień kliknij **🔊 Sprawdź dźwięk odliczania**. Dźwięki 3–2–1 generuje lokalnie przeglądarka, nie są nagraniami muzycznymi. Na iPhonie zwiększ głośność multimediów. Dźwięk piosenki pochodzi wyłącznie ze Spotify — nie jest odtwarzany przez stronę FILMSTER.

## Publikacja

Projekt statyczny, bez serwera. GitHub Pages: `Settings → Pages → Deploy from a branch → main / (root)`. Manifest: `manifest.webmanifest`; service worker: `sw.js`.

FILMSTER nie jest powiązany z marką Hitster ani ze Spotify.


## Katalog piosenek

W tej wersji: **753 utwory** w pięciu kategoriach: filmowe 127, polskie **288**, taneczne 90, romantyczne 81 i **dziecięce 167** (dla Stasia, Ignasia lub do wspólnej zabawy). Plik `songs-extra.js` zawiera 134 utwory dodatkowe, `songs-polish.js` zawiera kolejne **210 polskich piosenek** (klasyka i nowe utwory), a `songs-kids.js` zawiera kategorię dziecięcą (w tym 20 utworów z albumu *Lisek i przyjaciele*, 2023).

W ustawieniach po zaznaczeniu **Piosenki dla dzieci** można wybrać: „Staś i Ignaś — wszystkie”, „Staś (6 lat)”, „Ignaś (4 lata)” albo „Tylko piosenki wspólne”. Zawartość dziecięca obejmuje m.in. Bluey, Spidey, polskie piosenki oraz ścieżki dźwiękowe z filmów dla dzieci.

**Równe lata dają punkt.** Miejsca na osi czasu są przedziałami domkniętymi: jeśli przedział wybranego miejsca zawiera rok bieżącej piosenki, także taki sam jak na którejś sąsiedniej karcie, odpowiedź jest poprawna i daje +1 punkt. Na przykład dla kart 2020, 2023, 2023 i 2026 utwór z 2023 można wstawić w każde miejsce pomiędzy pierwszą i ostatnią kartą z 2023 włącznie.

Dalszy cel rozbudowy: 500 dodatkowych utworów w każdej pierwotnej kategorii. Polska ma już 210 z zamówionych 500 dodatkowych utworów. Zamówienie nie jest jeszcze w pełni zrealizowane. Uwaga: konkretne nagrania w Spotify mogą mieć daty inne niż pierwotne wersje.