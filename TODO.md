# TODO

Småfix och konkreta punkter som ska åtgärdas. Claude läser den här filen innan något större byggs.

- Bocka av med `[x]` och datum när en punkt är klar. Ta bort avbockade punkter när en fas är avslutad.
- Ange fil och rad när det går, och i vilken fas punkten senast måste vara åtgärdad.
- Större beslut hör hemma i ARCHITECTURE.md, inte här.

*Senast uppdaterad: 5 oktober 2026*

## Fas 1 (filsparande), klar 5 okt 2026

- [x] **Bestäm mappåtkomst eller filåtkomst.** Mapp, se ARCHITECTURE B-22. *(29 sep 2026)*
- [x] **`takeId` ändrar projektet direkt.** Nu en ren funktion; store sparar löpnumren via `newId` (B-23). *(29 sep 2026)*
- [x] **`serializeProject` kastar fel vid ogiltigt projekt.** Store kontrollerar med `validateProject` före sparning och skriver aldrig ett ogiltigt projekt (B-23). *(29 sep 2026)*
- [x] **Beslut: localStorage som reservkopia vid krasch.** Ja: varje ändring sparas i localStorage och rensas när filen är säkert sparad. Byggt i `storage/backup.ts` (B-25). *(5 okt 2026)*
- [x] **Rätta kriteriet för fas 1 i Plan 2.0.** Rättat i ARCHITECTURE B-19. *(5 okt 2026)*

## Att verifiera i webbläsare

Logiken är testad, men följande är inte provat i riktiga webbläsare. Bocka av när det är gjort.

- [ ] **Chrome och Edge, på Mac och Windows,** med `dist/GRC-verktyget-<version>.html` öppnad från disk: välj mapp, skapa, ändra kundnamnet, spara, stäng fliken (varning ska visas), öppna igen.
- [ ] **En synkad SharePoint- eller OneDrive-mapp:** att skrivningen fungerar och att ingen konfliktkopia uppstår.
- [ ] **Safari eller Firefox:** att "Spara" laddar ned en fil, att den går att öppna igen och att nedladdningen fungerar med CSP aktiv (den använder en `blob:`-adress).
- [ ] **Autosparningen med riktig tid:** att timern på tio minuter sparar och att varningen vid stängning visas.
- [ ] **Reservkopian:** ändra något, stäng fliken utan att spara (svara "Lämna") och öppna filen igen. Verktyget ska erbjuda att återställa ändringarna. Prova även att kopian syns på startsidan i Safari eller Firefox.

## Före fas 2 (startsida och vyer)

- [ ] **`App.svelte` är ett tillfälligt skal från fas 1.** Ersätt med den riktiga startsidan. Mapphandtag för "Senaste arbeten" sparas i IndexedDB (B-22), och behörigheten måste frågas om vid nästa besök.
- [ ] **Avsnittsnamn är hårdkodade för ISO 27001** (`src/App.svelte:215–216`: `'clauses'`, `'annex-a'`). Gå igenom `framework.sections` och använd `section.unit` och `section.title`, så att NIS2 och andra ramverk fungerar utan kodändring.

## Före fas 3 (risk)

- [ ] **O-03 måste avgöras:** regeln för faktisk restrisk (alternativ A eller B). Se ARCHITECTURE.

## Före fas 4 (evidens)

- [ ] **Dubblerade evidens-ID:n rapporteras med fel sökväg** (`src/lib/project/schema.ts`, `unique(evidenceIds, 'evidens', 'controls')` i `ProjectSchema.superRefine`). Felet pekar alltid på `controls`, även när dubbletten sitter på en risk. Rapportera den faktiska platsen, till exempel `risks.0.evidence.0.id`, och lägg till ett test.

## Före fas 5 (åtgärdsplan)

- [ ] **O-04 måste avgöras:** hur åtgärder skapas och hanteras (förslag eller automatiskt, vad som händer när underlaget ändras, en åtgärd för flera brister, prioritet). Se ARCHITECTURE.
- [ ] **README säger två olika saker om åtgärder** (4.7 "skapas automatiskt", 4.9 "föreslås"). Rätta README när O-04 är avgjord.

## Före fas 8 (lansering), gärna tidigare

- [x] **Versionsnummer och filnamn.** Versionen är 0.1.0, och bygget döper filen till `GRC-verktyget-<version>.html` (B-24). *(30 sep 2026)*
- [ ] **Rutin för att dela ut en ny version.** Var läggs filen (intranät, en SharePoint-mapp)? Hur får konsulterna veta att det finns en ny version? Ska gamla versioner ligga kvar? Skriv rutinen i README när den är bestämd.

## Småfix, när som helst

- [ ] **Uppdatera `plan-2.0.md` i Claude docs med det rättade kriteriet för fas 1** (B-19). Filen ligger på Windows-datorn, utanför repot.
- [ ] **Externt skript rapporteras två gånger** (`scripts/finalize-build.mjs:36–37`). Samma `<script src>` hittas både av skriptsökningen och attributsökningen. Ta bort dubbletten och uppdatera testet i `scripts/finalize-build.test.mjs`.
- [ ] **Felmeddelande på engelska** (`src/lib/frameworks/schema.ts`, `Duplication of ID`). Principen är svenska i allt användaren kan se (README, Principer). Meddelandet syns bara om en ramverksfil är trasig, men bör vara `Dubblett-ID: …` för att följa principen.
- [ ] **Kommentaren "Risknivå 1-5" är missvisande** (`src/lib/project/schema.ts`, ovanför `LevelSchema`). Den gäller nivån på konsekvens- och sannolikhetsskalan. Risknivån (riskvärdet) är 1–25.

## Beslut från Plan 2.0 som fortfarande behövs

- [ ] Vem skriver typriskerna och granskar bevisbördetexterna? En senior ISO-konsult, uppskattningsvis 3–4 dagar. Behövs före fas 3.
- [ ] Vilken kund kan vara testkund i fas 8?
- [ ] Hur mycket tid per vecka läggs på utvecklingen?
