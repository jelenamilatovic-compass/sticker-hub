# Sličica Hub — Deploy uputstvo

## Šta će ovo da uradi
Postavlja hub online na Cloudflare Pages — svi drugari preko interneta vide istu listu.
Free tier je više nego dovoljan: 100.000 zahtjeva dnevno, 1GB KV storage.

---

## Korak 1 — Otvori PowerShell u folderu

Klik desnim na folder `sticker-hub` → **Open in Terminal**
(ili otvori PowerShell pa `cd "C:\Users\38267\Desktop\sticker-hub"`)

## Korak 2 — Login na Cloudflare

```powershell
npx wrangler login
```

Otvoriće browser, ulogovaćeš se na Cloudflare (isti nalog kao za WBC).

## Korak 3 — Napravi KV namespace (mjesto đe se čuvaju podaci)

```powershell
npx wrangler kv namespace create STICKERS
```

Output će biti nešto kao:
```
🌀 Creating namespace with title "STICKERS"
✨ Success!
Add the following to your configuration file:
[[kv_namespaces]]
binding = "STICKERS"
id = "abc123def456..."
```

**Iskopiraj taj `id` string.**

## Korak 4 — Zalijepi ID u wrangler.toml

Otvori `wrangler.toml` u Notepad-u, zamijeni `ZAMIJENI_OVDJE_KV_ID` sa kopiranim ID-jem.

## Korak 5 — Deploy

```powershell
npx wrangler pages deploy . --project-name=sticker-hub
```

Prvi put će pitati da li da napravi novi Pages projekat — reci **da**.
Kada završi, dobićeš URL tipa: `https://sticker-hub.pages.dev`

## Korak 6 — Poveži KV sa Pages projektom (jednom)

Na Cloudflare dashboard-u:
1. Workers & Pages → klikni na `sticker-hub`
2. Settings → Functions → KV namespace bindings
3. **Add binding**:
   - Variable name: `STICKERS`
   - KV namespace: izaberi `STICKERS` iz dropdown-a
4. Save

Pošto se KV binding čita iz runtime-a, poslije podešavanja možda treba redeploy:
```powershell
npx wrangler pages deploy . --project-name=sticker-hub
```

---

## Gotovo!

URL: `https://sticker-hub.pages.dev` — pošalji drugarima, otvore na telefonu, registruju se, sve radi uživo.

## Kasnije izmjene

Bilo koja promjena u `index.html` ili `functions/api/players.js`:
```powershell
npx wrangler pages deploy . --project-name=sticker-hub
```

## Lokalno testiranje (pre deploy-a)

```powershell
npx wrangler pages dev .
```

Otvoriće `http://localhost:8788` — radi lokalno, ali KV se simulira.

---

## Backup podataka

Da povučeš sve trenutne podatke u fajl:
```powershell
npx wrangler kv key get --binding=STICKERS "all_players_v1" --remote > backup.json
```

## Custom domena (opciono)

Ako želiš `slicice.tvojadomena.com`:
- Pages → sticker-hub → Custom domains → Set up custom domain
