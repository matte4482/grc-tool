# TODO

Småfix och konkreta punkter som ska åtgärdas. Claude läser den här filen innan något större byggs.

- Bocka av med `[x]` och datum när en punkt är klar. Ta bort avbockade punkter när en fas är avslutad.
- Ange fil och rad när det går, och i vilken fas punkten senast måste vara åtgärdad.
- Större beslut hör hemma i ARCHITECTURE.md, inte här.

*Senast uppdaterad: 29 september 2026*

## Fas 1 (filsparande), pågår

- [x] **Bestäm mappåtkomst eller filåtkomst.** Mapp, se ARCHITECTURE B-22. *(29 sep 2026)*
- [x] **`takeId` ändrar projektet direkt.** Nu en ren funktion som tar löpnumren och returnerar nya; store sparar dem via `newId` (B-23). *(29 sep 2026)*
- [x] **`serializeProject` kastar fel vid ogiltigt projekt.** Store kontrollerar med `validateProject` före sparning, fångar felet och skriver aldrig (B-23). *(29 sep 2026)*
- [ ] **Prova i riktig webbläsare från `file://`.** Bygg med `npm run build` och öppna `dist/index.html` från disk:
  - Chrome och Edge, på Mac och Windows: välj mapp, skapa, ändra kundnamnet, spara, stäng fliken (varning ska visas), öppna igen.
  - En synkad SharePoint- eller OneDrive-mapp: att skrivningen fungerar och att ingen konfliktkopia uppstår.
  - Safari eller Firefox: nedladdningsläget, att "Spara" ger en fil och att den går att öppna igen.
  - Att nedladdningen fungerar med CSP aktiv. Den använder en `blob:`-adress; `img-src` tillåter `blob:`, men nedladdning är inte provad.
- [ ] **Autosparningen är inte provad med riktig tid.** Logiken är testad (`autosaveTick`), men timern på tio minuter och varningen vid stängning är bara provade i kod. Prova dem i webbläsaren.
- [ ] **Beslut: localStorage som reservkopia vid krasch.** Filen är det som gäller. Ska varje ändring också skrivas till localStorage och erbjudas vid nästa start om webbläsaren kraschat innan autosparningen? Kunddata skulle då ligga i webbläsaren tills filen sparats (B-02). Om ja: bygg i fas 1 och rensa kopian när filen sparats.
- [ ] **Rätta kriteriet för fas 1 i Plan 2.0.** "Arbetet överlever att datorn startas om och cachen rensas" stämmer inte som skäl: localStorage överlever omstart. Det verkliga kriteriet är att arbetet finns i kundens mapp och går att öppna på en annan dator.

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

## Småfix, när som helst

- [ ] **Externt skript rapporteras två gånger** (`scripts/finalize-build.mjs:36–37`). Samma `<script src>` hittas både av skriptsökningen och attributsökningen. Ta bort dubbletten och uppdatera testet i `scripts/finalize-build.test.mjs`.
- [ ] **Felmeddelande på engelska** (`src/lib/frameworks/schema.ts`, `Duplication of ID`). Principen är svenska i allt användaren kan se (README, Principer). Meddelandet syns bara om en ramverksfil är trasig, men bör vara `Dubblett-ID: …` för att följa principen.
- [ ] **Kommentaren "Risknivå 1-5" är missvisande** (`src/lib/project/schema.ts`, ovanför `LevelSchema`). Den gäller nivån på konsekvens- och sannolikhetsskalan. Risknivån (riskvärdet) är 1–25.

## Beslut från Plan 2.0 som fortfarande behövs

- [ ] Vem skriver typriskerna och granskar bevisbördetexterna? En senior ISO-konsult, uppskattningsvis 3–4 dagar. Behövs före fas 3.
- [ ] Vilken kund kan vara testkund i fas 8?
- [ ] Hur mycket tid per vecka läggs på utvecklingen?
