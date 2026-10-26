# TODO

Småfix och konkreta punkter som ska åtgärdas. Claude läser den här filen innan något större byggs.

- Bocka av med `[x]` och datum när en punkt är klar. Ta bort avbockade punkter när en fas är avslutad.
- Ange fil och rad när det går, och i vilken fas punkten senast måste vara åtgärdad.
- Större beslut hör hemma i ARCHITECTURE.md, inte här.

*Senast uppdaterad: 19 oktober 2026*

## Fas 1 (filsparande), klar 5 okt 2026

- [x] **Bestäm mappåtkomst eller filåtkomst.** Mapp, se ARCHITECTURE B-22. *(29 sep 2026)*
- [x] **`takeId` ändrar projektet direkt.** Nu en ren funktion; store sparar löpnumren via `newId` (B-23). *(29 sep 2026)*
- [x] **`serializeProject` kastar fel vid ogiltigt projekt.** Store kontrollerar med `validateProject` före sparning och skriver aldrig ett ogiltigt projekt (B-23). *(29 sep 2026)*
- [x] **Beslut: localStorage som reservkopia vid krasch.** Ja: varje ändring sparas i localStorage och rensas när filen är säkert sparad. Byggt i `storage/backup.ts` (B-25). *(5 okt 2026)*
- [x] **Rätta kriteriet för fas 1 i Plan 2.0.** Rättat i ARCHITECTURE B-19. *(5 okt 2026)*

## Att verifiera i webbläsare

Logiken är testad, men följande är inte provat i riktiga webbläsare. Bocka av när det är gjort.

- [x] **Chrome och Edge, på Mac och Windows,** med `dist/GRC-verktyget-<version>.html` öppnad från disk: välj mapp, skapa, ändra kundnamnet, spara, stäng fliken (varning ska visas), öppna igen.
- [x] **En synkad SharePoint- eller OneDrive-mapp:** att skrivningen fungerar och att ingen konfliktkopia uppstår.
- [x] **Safari eller Firefox:** att "Spara" laddar ned en fil, att den går att öppna igen och att nedladdningen fungerar med CSP aktiv (den använder en `blob:`-adress).
- [ ] **Autosparningen med riktig tid:** att timern på tio minuter sparar och att varningen vid stängning visas.
- [x] **Riskvyerna:** ändra riskmetoden, bedöm en typrisk, koppla en kontroll, sätt status i Annex A och se att faktisk restrisk ändras, godkänn, ta bort en typrisk och importera den igen. Prova Kopiera från kund.
- [x] **Bedömningsvyerna:** sätt status, skriv motivering och välj bort en kontroll i SoA, spara, stäng och öppna igen. Kontrollera att dialogen fungerar i Safari och Firefox.
- [x] **Startsidan (fas 2) i Chrome eller Edge från disk:** skapa ett projekt, stäng det, ladda om sidan och tryck "Fortsätt". Webbläsaren ska fråga om behörighet en gång, och projektet ska öppnas. Prova också att flytta projektfilen och trycka "Fortsätt" (tydligt fel ska visas).
- [x] **Senaste arbeten i Safari eller Firefox:** att listan sparas (IndexedDB) för filer som öppnas från disk, och att "Välj fil" öppnar filväljaren.
- [x] **Evidens (fas 4) i Chrome eller Edge, gärna i en synkad SharePoint-mapp:** bifoga flera filer med dra och släpp, öppna en PDF och en Word-fil, ändra en fil i mappen och se att den markeras, ta bort en referens. Kontrollera att mappen `evidens/` syns i SharePoint och att filerna går att öppna där.
- [ ] **Åtgärdsplan, dashboard och uppföljning (fas 5–7):** skapa åtgärder från förslag, lägg till ett förslag i en befintlig åtgärd, avbryt en åtgärd. Starta nästa bedömning i kundens SharePoint-mapp och kontrollera att evidensen hittas i den nya filen.
- [ ] **Rapporter (fas 8):** skriv ut den kompletta rapporten som PDF i Chrome och Edge (sidbrytningar, färger på staplar och matris). Öppna Word-filen i Word på Windows och Mac och kontrollera att logotypen syns (den är inbäddad som `data:`-bild, som äldre Word-versioner inte alltid visar). Öppna CSV-filerna i svenska Excel (å, ä, ö och kolumner).
- [ ] **Reservkopian:** ändra något, stäng fliken utan att spara (svara "Lämna") och öppna filen igen. Verktyget ska erbjuda att återställa ändringarna. Prova även att kopian syns på startsidan i Safari eller Firefox.

## Fas 2 (startsida och vyer)

- [x] **`App.svelte` var ett tillfälligt skal från fas 1.** Ersatt av `views/StartPage.svelte` och `views/ProjectPage.svelte`. Mapphandtagen för Senaste arbeten sparas i IndexedDB, och behörigheten frågas om vid "Fortsätt" (B-26). *(5 okt 2026)*
- [x] **Avsnittsnamn var hårdkodade för ISO 27001.** Startsidan och projektsidan går nu igenom `framework.sections` via `lib/compliance.ts`. *(5 okt 2026)*
- [x] **O-05 avgjord:** bedömningsvyerna byggs i fas 2 (B-28). *(7 okt 2026)*
- [x] **Startsidan enligt skissen:** ny utformning, startpunkt med typrisker, dra och släpp, stapel per status (B-29). *(7 okt 2026)*
- [x] **Bedömningsvyerna (B-28):** flikar, Grundkrav, Annex A, SoA och översikt. *(7 okt 2026)*
- [x] **Versionen skilde sig** mellan `package.json` och `package-lock.json`. Båda har nu 0.8.0 (B-41). Kör `npm install` före nästa commit. *(14 okt 2026)*
- [x] **`countControls` borttagen**, den användes bara av sitt eget test. *(7 okt 2026)*
- [x] **`confirm()` ersatt** av en egen dialog med tydliga knappar (`lib/ui/dialog.svelte.ts`). *(7 okt 2026)*
- [x] **`src/components/ProgressBar.svelte` borttagen** *(14 okt 2026)*

## Fas 3 (risk)

- [x] **O-03 avgjord:** alternativ B med justeringarna 1–4 (B-27). *(7 okt 2026)*
- [x] **Bedömningsvyerna är klara** (fas 2, B-28). *(7 okt 2026)*
- [x] **Typrisker låser kontroller i SoA direkt.** Avgjort: typrisker som inte gäller tas bort, och kontrollerna låses då upp (B-30). *(7 okt 2026)*
- [x] **Föreslå text från risker** och riskvärde vid kopplade risker i Annex A. *(7 okt 2026)*
- [x] **Fas 3 byggd:** riskmetod, riskregister, riskdetalj, restrisk enligt B-27, godkännande, typrisker och Kopiera från kund. *(7 okt 2026)*
- [x] **15 typrisker skrivna** i `src/lib/risk/typrisker-iso27001.yaml` (B-29). *(7 okt 2026)*
- [ ] **Typrisker:** en senior ISO-konsult granskar de 15 och lägger till fler (målet är 25–30), och granskar bevisbördetexterna.

## Fas 4 (evidens)

- [x] **Dubblerade ID:n rapporteras med rätt sökväg,** till exempel `risks.0.evidence.0.id`, med test i `project.test.ts`. Gäller även risk-ID:n. *(12 okt 2026)*
- [x] **"Saknar evidens"** i Behöver uppmärksamhet och på översikten (B-31). *(12 okt 2026)*
- [x] **Fas 4 byggd:** bifoga, öppna, kontrollera och ta bort evidens på kontroller och risker; filformat för fynd (B-31–B-33). *(12 okt 2026)*

## Fas 5–8 (åtgärdsplan, dashboard, progress, rapporter)

- [x] **O-04 avgjord:** förslag som konsulten godkänner, ingen borttagning, koppla till befintlig, valfri prioritet (B-34). *(14 okt 2026)*
- [x] **README rättad** om åtgärder (4.7 och 4.9). *(14 okt 2026)*
- [x] **Fas 5–8 byggda:** åtgärdsplan, dashboard, uppföljning, rapporter som PDF, Word och Excel, instruktion (B-34–B-41). *(14 okt 2026)*
- [x] **Utskrift av SoA** (README 4.8, krav 6.1.3 d) i Rapporter. *(14 okt 2026)*
- [x] **Vem som ändrade** skrivs i `updated.by` och `history.by` (B-36). *(14 okt 2026)*
- [x] **Versionsnummer och filnamn** (B-24). Versionen är 0.8.0. *(14 okt 2026)*
- [ ] **O-06: rutin för att dela ut en ny version.** Förslag finns i ARCHITECTURE. Skriv rutinen i README när den är bestämd. Före M4.
- [x] **Logotyp som bild** i sidhuvudet och rapporterna (`src/lib/ui/logo.jpg`, B-42). *(15 okt 2026)*
- [ ] **Kundtest (M4):** en hel gapanalys hos en befintlig kund. Mät tiden mot hur det görs i dag.

## Efter M4

- [ ] **Import från granskningsverktyg: Lynis, OpenSCAP och CIS-CAT Lite** (O-07). Översätt resultaten till `grc-fynd` (B-33) och koppla fynden till kontrollerna i projektets ramverk (B-46). Kontrollera först verktygens utdataformat.

- [x] **CIS Azure-benchmarks som YAML** i `src/lib/benchmarks/`: 339 rekommendationer med ID, svensk rubrik, nivå och kopplingar (B-45). *(20 okt 2026)*
- [ ] **Granska de svenska rubrikerna** i `src/lib/benchmarks/*.yaml`. De är maskinnära översättningar och kan behöva justeras.
- [ ] **Skriv egna åtgärdstexter (`remediation`)** med Microsoft Learn och Azure Policy som källa, inte CIS-texterna. Börja med Foundations, Level 1, automatiserade.
- [ ] **Stäm av med CIS** att egna kontroller med hänvisning till ID:n är tillåtna i betalda uppdrag.

## Småfix, när som helst

- [ ] **Stavfel i kommentarer** som Claude inte rör (arbetsreglerna): `project.ts:14` "ananrs", `session.ts:182` "resnas localStoarage", `App.svelte:27` "vis". `project.ts:97` har `//… */` i stället för `/** … */`. (Kommentaren i `frameworks/schema.ts` rättad 15 okt 2026.)
- [ ] **`newId` i `session.ts` och `store.svelte.ts` används bara av testerna.** Ändringsfunktionerna tar ID:n med `nextId` (B-41). Ta bort `newId` eller rätta kommentaren om att det är det enda sättet.

- [x] **Plan 2.0 uppdaterad** med besluten i ARCHITECTURE. Den gällande versionen ligger i Claude-projektet MSecComp (`claude/plan-2.0.md`). *(7 okt 2026)*
- [x] *(7 okt 2026)* **Externt skript rapporteras två gånger** (`scripts/finalize-build.mjs:36–37`). Samma `<script src>` hittas både av skriptsökningen och attributsökningen. Ta bort dubbletten och uppdatera testet i `scripts/finalize-build.test.mjs`.
- [x] *(7 okt 2026, nu "Dubblett-ID")* **Felmeddelande på engelska** (`src/lib/frameworks/schema.ts`, `Duplication of ID`). Principen är svenska i allt användaren kan se (README, Principer). Meddelandet syns bara om en ramverksfil är trasig, men bör vara `Dubblett-ID: …` för att följa principen.
- [x] **Kommentaren "Risknivå 1-5" i `schema.ts` var missvisande.** Rättad *(7 okt 2026)*

