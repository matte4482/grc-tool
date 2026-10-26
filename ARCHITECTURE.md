# Arkitektur och designbeslut

Den här filen samlar alla designbeslut i projektet, i den ordning de fattades. Den är projektets minne: läs den först när du byter dator eller tar upp arbetet efter ett uppehåll.

- **Vad verktyget ska göra** och hur koden är organiserad beskrivs i [README.md](README.md).
- **Varför det är byggt så** står här.

Varje beslut har en status:

| Status | Betydelse |
|---|---|
| **Beslutat** | Gäller och är genomfört i koden. |
| **Planerat** | Bestämt, men inte genomfört ännu. |
| **Öppet** | Behöver ett beslut innan arbetet kan fortsätta. |

Nya beslut läggs till sist, med nästa lediga nummer. Ett beslut som ändras skrivs inte över. Det markeras som *Ersatt av B-xx*, och det nya beslutet förklarar varför.

---

## Nuläge

*Senast uppdaterad: 15 oktober 2026*

- **Fas:** 5–8 är klara i koden (14 oktober 2026): åtgärdsplan, dashboard, uppföljning och rapporter (B-34–B-41). Version 0.8.0. Det som återstår till M4 är att prova i riktiga webbläsare, ett kundtest och rutinen för nya versioner (O-06), se TODO.md.
- **Klart i fas 0:**
  - Projektet är uppsatt med Svelte, TypeScript och Vite.
  - ISO/IEC 27001:2022 är flyttat från det gamla verktyget (`legacy/method-grc-verktyg.html`) till YAML, med schema och test.
  - Grundkraven i kapitel 6 följer standardens numrering (B-15).
  - Projektfilens datamodell (`src/lib/project/`) med tester och en påhittad exempelfil (B-17).
  - Register över ramverk (B-21).
  - Bygget ger en enda fristående HTML-fil med säkerhetspolicy (B-03, B-20).
  - Vites startmall är ersatt av ett enkelt skal, och det felaktiga beroendet `npm` är borttaget.
  - `npm test` och `npm run build` går igenom lokalt (26 september 2026).
- **Klart i fas 1:**
  - Konsulten väljer uppdragets mapp, och projektfilen sparas där (B-22).
  - Store med sparstatus, autosparning var tionde minut och varning vid stängning (B-23).
  - `takeId` är en ren funktion; nya ID:n skapas bara via store (B-23).
  - Ett ogiltigt projekt skrivs aldrig till fil; felet visas i sparstatusen (B-23).
  - Mappsparandet och store är provade i Chromium mot webbläsarens privata filyta (OPFS), med CSP aktiv.
  - Versionen är 0.1.0, och bygget döper filen efter versionen (B-24).
  - Varje ändring sparas som reservkopia i webbläsaren och rensas när filen är säkert sparad (B-25).
- **Klart i fas 2:**
  - Startsidan med Nytt arbete (kund och ramverk; bara ISO 27001 går att välja, övriga visas som "Kommer"), Öppna befintligt arbete och Senaste arbeten med förlopp (B-26).
  - "Fortsätt" öppnar ett projekt i en sparad mapp med ett klick, plus webbläsarens fråga om behörighet.
  - Flödena för mapp och fil ligger i `storage/workflow.ts` och är testade utan webbläsare.
  - Förloppet räknas i `lib/compliance.ts` utifrån ramverkets avsnitt, utan hårdkodade ISO-avsnitt.
  - "Stäng" i sidhuvudet: sparar först i en mapp, frågar vid nedladdning. Sessionen vägrar stänga med osparade ändringar om inte anroparen uttryckligen godkänt det.
  - Startsidan enligt skiss, med 15 typrisker som startpunkt och dra och släpp (B-29).
  - Flikar: Översikt, Grundläggande krav, Annex A och SoA (B-28). Logiken ligger i `lib/assessment.ts` och är testad.
  - Grundkrav och Annex A: status, motivering, ansvarig, evidensanteckning, valfri teknisk och organisatorisk del, bevisbörda och kopplade risker. Sök, statusfilter, "Dölj ej tillämpliga" och "Behöver uppmärksamhet".
  - SoA: tillämplighet och motivering per kontroll. Kontroller kopplade till risker är låsta som tillämpliga.
  - Översikt: uppfyllnadsgrad, fördelning per status, per avsnitt och tema, och genvägar till det som behöver uppmärksamhet.
  - Egen dialog i stället för `confirm()`. Esc i frågan om reservkopian behåller kopian.
  - Provat i Chromium med CSP aktiv, både med mappåtkomst och i nedladdningsläge.
- **Klart i fas 3:**
  - Riskmetod med redigerbara skalor, konsekvenstyper, matris, acceptansnivå, intervall och fastställande. Standardmetoden gäller tills något ändras.
  - Riskregister med nyckeltal, värmekarta (före, planerad, faktisk), sök och filter, markering av saknade uppgifter och varning när faktisk restrisk är högre än planerad.
  - Riskdetalj med bedömning i tre steg, kopplade kontroller med effektivitet och typ, godkännande av restrisk, historik och borttagning.
  - Restrisken räknas enligt B-27 i `lib/risk/rules.ts`; ändringarna ligger i `lib/risk/operations.ts`. Båda är testade.
  - Typrisker kan tas bort och importeras igen. "Kopiera från kund" på startsidan.
  - Annex A visar riskvärde vid kopplade risker och har "Föreslå text från risker". Översikten visar risknyckeltal.
- **Klart i fas 4:**
  - Bifoga filer på grundkrav, Annex A-kontroller och risker, med knapp eller dra och släpp. Filerna kopieras till `evidens/<ID>/` bredvid projektfilen (B-31).
  - Kontrollsumma (SHA-256): samma fil kopieras inte två gånger, och ändrade eller saknade filer markeras. Översikten kan kontrollera alla filer.
  - Öppna evidensen i en ny flik direkt från kontrollen. Ta bort tar bara bort referensen.
  - "Saknar evidens" i Behöver uppmärksamhet och på översikten. Antal filer visas på raden.
  - Konsultens namn sparas i webbläsaren och skrivs vid bifogad fil (B-32).
  - Filformatet för fynd från automatisk granskning är bestämt och testat (B-33).
  - Dubblerade ID:n rapporteras med rätt sökväg i projektfilen.
- **Klart i fas 5:** åtgärdsförslag och åtgärder enligt B-34, åtgärdsplanen med filter och varningar, åtgärder vid kontroller och risker, länkar mellan flikarna (B-35), utskrift av riskbehandlingsplanen. Vem som ändrade skrivs in (B-36).
- **Klart i fas 6:** översikten är dashboard med "redo för revision" (B-37), åtgärder, riskprofil och lägesbild på en sida.
- **Klart i fas 7:** starta nästa bedömning, jämförelse med en tidigare fil och progressrapport (B-38).
- **Klart i fas 8:** rapporterna (komplett, lägesbild, gapanalys, SoA, riskbehandlingsplan med riskmetoden, progress) som PDF och Word, export till Excel (B-39), uppdragsuppgifter (B-40), instruktion i verktyget och version 0.8.0 (B-41).
- **Utseende (15 okt):** Method-logotypen, större text, ny layout på översikten och rymligare textfält (B-42). Menyknapp, statusfärger, Klar i riskmetoden och val av konsekvenstyp (B-43). Avskalade texter i alla vyer (B-44).
- **Kodkvalitet:** gemensamma hjälpfunktioner, kommentar överst i varje fil och DATAFLOW.md (B-41). 197 enhetstester, svelte-check utan fel, alla flöden provade i Chromium.
- **Att verifiera:** fas 1–8 i riktiga webbläsare, se TODO.md.
- **Nästa steg:** prova i Chrome och Edge på Mac och Windows, kundtest (M4), O-06. Därefter fler ramverk och CloudSecComp.
- **Väntar på beslut:** O-06 (rutin för nya versioner), vem som granskar typriskerna, testkund.

---

## B-01 · Svelte 5 + TypeScript + Vite, utan SvelteKit

**Status:** Beslutat

Verktyget är en ren klientapp utan server. Vi använder Vite-mallen `svelte-ts` i stället för SvelteKit. SvelteKit tillför routing, serverrendering och adaptrar som vi inte behöver. Det gör också bygget till en enda fil (B-03) krångligare.

Svelte 5 med runes (`$state`, `$derived`) används för all delad state. Vi använder inga externa state-bibliotek.

## B-02 · All data stannar hos kunden

**Status:** Beslutat

Method IT ska aldrig lagra kunddata. Verktyget har ingen backend, ingen inloggning och ingen telemetri. En bedömning sparas som en projektfil i kundens egen mapp, till exempel i SharePoint (se B-10).

Kunddata får heller aldrig hamna i repot. Därför innehåller `.gitignore` reglerna `*.grc.json` och `exports/`. Enda undantaget är avidentifierade testfiler i `tests/fixtures/`.

## B-03 · Leverans som en enda HTML-fil

**Status:** Beslutat

Det gamla verktyget är en enda HTML-fil som går att öppna utan installation, och det ska det nya också vara.

Så går bygget till (`npm run build`):

1. **Vite** bygger appen från `index.html` och `src/main.ts`. Svelte-komponenterna kompileras till vanlig JavaScript, TypeScript-typerna tas bort och YAML-ramverken blir JavaScript-objekt (B-09).
2. **`vite-plugin-singlefile`** bäddar in all JavaScript och CSS direkt i `dist/index.html`, som döps om i steg 4. Pluginet är bara aktivt vid bygget, inte i utvecklingsservern eller testerna.
3. **`publicDir: false`** i `vite.config.ts` gör att inga filer kopieras bredvid index.html. Ikonen ligger som en data:-adress i `index.html`.
4. **`scripts/finalize-build.mjs`** kontrollerar resultatet, lägger in CSP (B-20) och döper om filen efter versionen (B-24). Bygget misslyckas om `dist/` innehåller mer än `index.html`, om filen hänvisar till något utanför sig själv, eller om versionen i `package.json` är ogiltig.

Konsekvens: alla ramverk, typsnitt och ikoner bäddas in i filen vid bygget. Verktyget får inte hämta något från nätet när det körs. Typsnitten är systemtypsnitt (Calibri, Cambria med reserver), så inga typsnittsfiler behövs.

## B-04 · Ramverk är data i YAML, inte kod

**Status:** Beslutat

Kraven och kontrollerna i ett ramverk ligger i `src/lib/frameworks/<ramverk>-<version>.yaml`. Förut låg de som ett JavaScript-objekt inuti HTML-filen.

Skäl:

- **Flera ramverk:** NIS2, CIS Controls v8 och DORA ska kunna läggas till utan att någon kod ändras.
- **Läsbarhet:** innehållet ska kunna granskas och ändras av någon som inte programmerar.
- **Ett gemensamt format:** en framtida automatisk kontroll av molnmiljöer ska kunna läsa kraven i samma format.

YAML valdes före JSON eftersom det tål kommentarer och långa svenska texter bättre, och ger rena diffar.

## B-05 · Ett gemensamt schema för alla ramverk, validerat med zod

**Status:** Beslutat

Alla ramverksfiler följer schemat i `src/lib/frameworks/schema.ts`:

```
Ramverk → avsnitt (sections) → grupper (groups) → kontroller (controls)
```

- **`schemaVersion: 1`** finns i varje fil, så att formatet kan utvecklas och gamla filer ändå kännas igen.
- **`soa: true`** på ett avsnitt betyder att dess kontroller ingår i Statement of Applicability. I ISO 27001 gäller det bara Annex A.
- **`unit`** styr UI-texter som "26 krav" och "93 kontroller".
- **Nya fält är alltid valfria.** Exempel är kopplingar mellan ramverk och uppgifter för automatiska kontroller. Befintliga filer ska aldrig sluta validera.
- **ID:n kontrolleras.** Schemat ser till att alla kontroll-ID:n i ett ramverk är unika.

## B-06 · Kontroll-ID:n är alltid fullständiga textsträngar

**Status:** Beslutat

Ett ID skrivs alltid ut i sin helhet, till exempel `"4.1"` och `"A.8.10"`. Det gamla verktyget använde ett separat `idPrefix`, och det är borttaget.

ID:n ska aldrig behandlas som tal. Om YAML läser `8.10` utan citattecken blir det talet `8.1`, och då krockar det med `A.8.1`. Testet `iso27001.test.ts` kontrollerar just det fallet.

## B-07 · Fältet `guidance` i stället för `evidence`

**Status:** Beslutat

Texten om vad revisorn förväntar sig se heter `guidance` (i UI: "Bevisbörda"). Namnet `evidence` är reserverat för den faktiska evidensen, alltså bifogade filer och liknande. Den hör hemma i projektfilen, inte i ramverket.

## B-08 · Ramverket flyttas oförändrat först, rättelser görs separat

**Status:** Beslutat

I fas 0 flyttades ISO 27001 till YAML utan att någon text eller något ID ändrades. Innehållet stämdes av fält för fält mot originalet: 119 kontroller, alla identiska. Rättelser görs i egna commits, så att det syns vad som är flytt och vad som är ändring.

Konvertering görs med `scripts/extract-framework.mjs`. Skriptet läser HTML-filen direkt, så inget behöver klistras in för hand. Det behövs inte igen, men sparas som dokumentation av hur flytten gick till.

## B-09 · YAML importeras vid bygget via `@rollup/plugin-yaml`

**Status:** Beslutat

Ramverken importeras som moduler: `import raw from './iso27001-2022.yaml'`. Datan valideras sedan med `FrameworkSchema.parse(raw)`.

- **Inga filer läses i webbläsaren.** Allt bäddas in vid bygget, vilket stämmer med B-03.
- **Testerna läser filen på samma sätt som appen.** Vitest använder samma `vite.config.ts`.
- **`src/yaml.d.ts`** typar `*.yaml` som `unknown`. Det tvingar fram validering med zod innan datan används.

## B-10 · Projektfil `.grc.json` i kundens mapp

**Status:** Beslutat · datamodellen beskrivs i B-17

Varje kunduppdrag är en JSON-fil med ändelsen `.grc.json`. Den innehåller kund, ramverk, riskmetod, riskregister, kontrollbedömningar, SoA och åtgärdsplan. Utkastet till format finns i README.

- **Formatet valideras med zod** och har ett eget `schemaVersion`. Schemat finns i `src/lib/project/schema.ts`.
- **Ett ramverk per projektfil.** Om en kund behöver både ISO 27001 och NIS2 blir det två uppdrag.
- **Ramverket anges med `id` och `version`**, men själva innehållet kopieras inte in i projektfilen.

Hur verktyget sparar till filen avgjordes i O-01.

## B-11 · Gamla sparfiler ska kunna läsas in

**Status:** Ersatt av B-16

Det gamla verktyget exporterar `{ version: 4, client, exported, data }`. I `data` sparas status per kontroll under nycklar som `K4.1` (grundkrav) och `A5.1` (Annex A). Det nya formatet använder `4.1` och `A.5.1`.

Importen översätter nycklarna så här:

| Gammal nyckel | Ny nyckel |
|---|---|
| `K` + id | id |
| `A` + id | `A.` + id |

Undantag: grundkraven i kapitel 6 har fått nya ID:n (B-15) och översätts med en egen tabell, till exempel `K6.4` → `6.1.3 d`.

Fälten mappas så här:

| Gammalt fält | Nytt fält |
|---|---|
| `s` | `status` |
| `c` | `comment` |
| `doc` | `evidenceNote` |
| `own` | `owner` |
| `app` | `applicable` |
| `m` | `soaJustification` |

Äldre versioner (v2 och v3) översätts på samma sätt som det gamla verktygets egen `migrate()`.

## B-12 · TypeScript-inställning för `vite.config.ts`

**Status:** Beslutat

`tsconfig.node.json` använder `"module": "esnext"` och `"moduleResolution": "bundler"`, inte `nodenext`. Med `nodenext` behandlas `@rollup/plugin-yaml` som ett CommonJS-paket, och standardimporten får felet "not callable". Konfigurationsfilen byggs av Vite, så `bundler` är rätt läge.

## B-13 · Två datorer: samma Node-version, en gemensam lockfil, inga hemligheter

**Status:** Beslutat

Utvecklingen sker på både Mac och Windows.

- **Node-version:** `.nvmrc` anger Node 24.
- **Lockfil:** `package-lock.json` committas alltid, så att båda datorerna får exakt samma paketversioner.
- **Beroenden:** alla ligger i en enda `package.json` i repots rot.
- **Sökvägar:** skript använder alltid `node:path` (`join`, `resolve`), aldrig hårdkodade snedstreck.
- **Radslut:** normaliseras via `.gitattributes`.

## B-14 · Tester ligger bredvid koden

**Status:** Beslutat

Testfiler heter `*.test.ts` och ligger bredvid det de testar. Varje ramverk har ett test som låser antalet kontroller per grupp och kontrollerar att ID:n är unika textsträngar.

- `npm test` kör alla tester en gång.
- `npm run test:watch` kör om testerna vid varje ändring.
- `npm run check` gör typkontrollen.

## B-15 · Kontroll-ID:n följer standardens numrering

**Status:** Beslutat · avgör O-02

Alla ID:n ska vara de nummer som står i standarden, så att de kan kopplas mot andra ramverk och mot framtida automatiska kontroller. I det gamla verktyget var grundkraven i kapitel 6 numrerade i löpordning. De har nu bytts ut:

| Gammalt ID | Nytt ID | Krav |
|---|---|---|
| 6.1 | 6.1.1 | Hantering av risker och möjligheter |
| 6.2 | 6.1.2 | Dokumenterad metod för riskbedömning |
| 6.3 | 6.1.3 | Riskbehandlingsplan |
| 6.4 | 6.1.3 d | Statement of Applicability (SoA) |
| 6.5 | 6.2 | Mätbara informationssäkerhetsmål |
| 6.6 | 6.3 | Planering av ändringar i ledningssystemet |

Övriga grundkrav (kapitel 4, 5 och 7–10) och alla Annex A-kontroller stämde redan med standarden. Texterna är oförändrade.

- **SoA har ID:t `6.1.3 d`.** SoA är en punkt i krav 6.1.3, inte ett eget krav, men den ska kunna bedömas för sig. Därför används standardens egen hänvisning, med mellanslag.
- **Testet låser numreringen.** `iso27001.test.ts` kontrollerar att kapitel 6 har exakt dessa ID:n.
- **Gamla sparfiler** skulle översättas med tabellen ovan (B-11). Det gäller inte längre, eftersom gamla filer inte läses in (B-16).

## B-16 · Nytt verktyg, gamla sparfiler läses inte in

**Status:** Beslutat · ersätter B-11

Beslutat 25 september 2026. Det nya verktyget byggs från grunden och är inte en ny version av det gamla. Det gamla verktyget (`legacy/method-grc-verktyg.html`) är förebild för innehåll och arbetssätt, och ramverket är flyttat därifrån (B-08), men dess sparfiler behöver inte gå att öppna.

Skäl:

- Det nya verktyget har många fler funktioner (risker, evidens, åtgärder, jämförelse). En översättning från det gamla formatet skulle bara fylla en liten del av projektfilen och ändå kräva underhåll.
- Gamla bedömningar görs om i det nya verktyget när kunden bedöms nästa gång.

Konsekvenser:

- Punkten om migrering i fas 0 och punkten om att uppgradera gamla filer i fas 7 stryks ur Plan 2.0.
- Kriteriet för att fas 0 är klar blir: ett nytt projekt kan sparas, öppnas igen och valideras utan att något ändras.
- Om någon försöker öppna en gammal exportfil visas "Filen är inte en giltig projektfil." Den skrivs aldrig över.
- Jämförelse i fas 7 fungerar bara mellan bedömningar som gjorts i det nya verktyget.

## B-17 · Projektfilens datamodell

**Status:** Beslutat

Datamodellen i `src/lib/project/schema.ts` har plats för allt i Plan 2.0 från start, även det som byggs i senare faser. Då behöver formatet inte ändras för varje fas.

- **Fasta ID:n (krav för fas 7).** Risker, åtgärder och evidens får ID:n av formen `R-001`, `ATG-001` och `EV-001`. Löpnumren ligger i `nextNumber` i projektfilen. Ett ID återanvänds aldrig, inte ens när posten tas bort, eftersom jämförelsen mellan två bedömningar matchar på ID. Kontroller identifieras med ramverkets ID (B-06).
- **ID för bedömningen.** Varje projektfil har ett `id` (UUID) och kan ha `previousId`, som pekar på bedömningen den utgår från.
- **Fält som saknas fylls i vid inläsning.** Tomma texter, tomma listor och standardvärden behöver inte stå i filen. Det gör att nya valfria fält kan läggas till utan att äldre filer slutar validera.
- **Beräknade värden sparas aldrig.** Riskvärde, nivå, faktisk restrisk och uppfyllnadsgrad räknas fram.
- **Kopplingen mellan risk och kontroll är ett objekt**, `{ control, effect?, type? }`, inte bara ett ID. Effekt och typ är valfria, så modellen fungerar med både alternativ A och B i O-03.
- **Godkännande av restrisk över acceptansnivån** kräver en motivering. Det kontrolleras i schemat.
- **Evidens kan finnas på både kontroller och risker** och har sökväg, storlek, `sha256`, källa, vem som lade till den och när. Kontrollsumman gör att verktyget kan varna om en fil har flyttats eller ändrats.
- **Kontroller mot ramverket görs separat.** Schemat känner inte till ramverket. `checkAgainstFramework()` i `project.ts` kontrollerar okända kontroll-ID:n, att grundkrav inte väljs bort och att kontroller som är kopplade till en risk inte är bortvalda.
- **Inläsning kastar aldrig.** `parseProject()` returnerar antingen ett giltigt projekt eller en lista med felmeddelanden med sökväg, till exempel `controls.A.8.20.status: …`. En fil från en nyare version av verktyget avvisas med ett eget meddelande.

## B-18 · Grunden för CloudSecComp

**Status:** Beslutat

CloudSecComp, en automatisk granskning av kundens molnmiljö, byggs inte nu. Enligt Plan 2.0 läggs fyra saker in så att det kan kopplas på senare utan omskrivning:

| Vad | Fas | Hur |
|---|---|---|
| Fasta ID:n för alla Annex A-kontroller | 0 | Klart genom B-06 och B-15 |
| Status per kontroll kan delas i teknisk och organisatorisk del | 0 | Valfritt fält `parts: { technical, organizational }` |
| Källa på varje evidens | 4 | Fältet `source`: `manual` eller `automatic` (finns redan i schemat) |
| Beskrivet filformat för import av fynd | 4 | Beskrivs i fas 4 |

Den övergripande statusen sätts alltid av konsulten. Delarna är underlag, inte en beräkning. Regeln för hur en automatisk teknisk bedömning påverkar den övergripande statusen bestäms när CloudSecComp byggs.

Inloggning mot kundens molnmiljö kräver ett riktigt program, eftersom en HTML-fil inte kan skydda en hemlighet. Molnsynken väntar därför till en skrivbordsversion.

## B-19 · Faser enligt Plan 2.0

**Status:** Beslutat

Arbetet följer de nio faserna (0–8) och milstolparna M1–M4 i Plan 2.0, med ändringarna i B-16. Fastabellen i README är uppdaterad. Nya idéer läggs efter M4, inte i pågående fas. Planen och rapporter om arbetet hålls utanför repot.

Ändringar mot Plan 2.0:

- **Fas 0 och 7:** gamla sparfiler läses inte in (B-16).
- **Fas 2:** omfattar även bedömningsvyerna (B-28).
- **Fas 3:** planerad och faktisk restrisk räknas båda fram enligt B-27. README sa tidigare att planerad restrisk anges för hand.
- **Fas 1, kriteriet för klar:** planen säger att arbetet ska överleva att webbläsaren stängs, datorn startas om och cachen rensas. Det stämmer inte som skäl, eftersom localStorage överlever omstart. Det verkliga kriteriet är att arbetet finns i kundens mapp, går att öppna på en annan dator och inte försvinner om webbläsaren kraschar mellan sparningarna (B-22, B-23, B-25).

## B-20 · Säkerhetspolicy (CSP) i den byggda filen

**Status:** Beslutat

Efter bygget lägger `scripts/finalize-build.mjs` in en `Content-Security-Policy` som `<meta>`-tagg direkt efter `<meta charset>`, före alla skript.

| Regel | Effekt |
|---|---|
| `default-src 'none'` | Allt som inte uttryckligen tillåts är förbjudet. |
| `script-src 'sha256-…'` | Bara exakt det skript som bygget gav får köras. Ändras ett enda tecken i filen körs inget skript alls. |
| `connect-src 'none'` | Verktyget kan inte skicka eller hämta något över nätet: ingen telemetri och inga anrop hem (B-02). |
| `style-src 'unsafe-inline'` | Krävs eftersom CSS:en är inbäddad och Svelte sätter stilar på element. Stilar kan inte skicka data. |
| `img-src data: blob:`, `font-src data:` | Bara inbäddade bilder och typsnitt. |
| `object-src`, `base-uri`, `form-action` `'none'` | Stänger vanliga vägar för injektion. |

Skäl:

- Projektfilerna innehåller känsliga uppgifter om kundens säkerhetsbrister. Även om verktyget självt aldrig skickar något, gör CSP:n att inte heller en bugg, ett beroende eller en ändrad fil kan göra det.
- Hashen gör att en fil som ändrats efter bygget slutar fungera i stället för att köra ändrad kod.

Konsekvenser:

- CSP:n läggs in efter bygget och inte i `index.html`, eftersom utvecklingsservern behöver nätverk och kör ändrade skript hela tiden.
- Zod får inte generera kod med `new Function`. `src/lib/zod-setup.ts` sätter `jitless: true` och importeras först i `main.ts`.
- Om verktyget någon gång behöver nätet (till exempel CloudSecComp) blir det i skrivbordsversionen, inte genom att öppna CSP:n (B-18).

Verifierat 25 september 2026 i Chromium med filen öppnad direkt från disk: projektlogik och zod fungerar, `fetch` blockeras och ett ändrat skript körs inte. Hela bygget med Svelte-appen gick igenom lokalt den 26 september 2026.

## B-21 · Ramverksregister och felmeddelanden på svenska

**Status:** Beslutat

- **Register.** `src/lib/frameworks/index.ts` listar alla ramverk. Tillgängliga ramverk valideras med zod när modulen laddas, så ett fel i en YAML-fil stoppar både testerna och appen direkt. Kommande ramverk (NIS2, CIS Controls v8, DORA) står i samma lista utan innehåll och visas som "Kommer" på startsidan.
- **Svenska felmeddelanden.** `parseProject()` använder zods svenska språkpaket. Egna meddelanden i schemat, till exempel om motivering för godkännande, går före. Testerna kontrollerar sökvägen till felet och inte zods ordalydelse, eftersom den kan ändras mellan versioner.

## B-22 · Konsulten väljer uppdragets mapp

**Status:** Beslutat

Beslutat 29 september 2026. Verktyget får åtkomst till **uppdragets mapp** med `showDirectoryPicker`, inte bara till projektfilen med `showSaveFilePicker`.

Skäl:

- **Evidens i fas 4.** Bifogade filer ska sparas i en mapp `evidens/` bredvid projektfilen. Med åtkomst bara till projektfilen skulle konsulten behöva välja mappen en gång till i fas 4, och sparandet skulle behöva byggas om.
- **Öppna utan att leta efter filen.** Konsulten väljer kundens mapp, och verktyget hittar projektfilen själv.

Så fungerar det (`src/lib/storage/`):

- **Nytt arbete:** konsulten anger kundnamn och väljer mapp. Projektfilen får namn efter kunden, till exempel `exempelbolaget-ab.grc.json` (`projectFileName`), och sparas direkt. Finns en fil med samma namn skapas ingen ny.
- **Öppna:** konsulten väljer mappen. Finns en projektfil öppnas den; finns flera får konsulten välja.
- **Skrivning:** `createWritable()` skriver till en tillfällig fil och byter ut originalet först när skrivningen är klar. En avbruten sparning lämnar den gamla filen orörd.
- **Behörighet:** webbläsaren frågar om verktyget får läsa och skriva i mappen. Frågan måste komma från ett klick.
- **Sparmål:** store känner bara till gränssnittet `SaveTarget` (`target.ts`), inte om det är en mapp eller en nedladdning. Då kan sparandet bytas ut, till exempel mot en skrivbordsversion, utan att store ändras.

Reservläge i Safari och Firefox (O-01): "Spara" laddar ned en kopia (`download.ts`), och "Öppna" läser en vald fil. Nedladdningar autosparas aldrig, eftersom varje sparning annars ger en ny fil i Hämtade filer. Sparstatusen säger det tydligt.

Senaste arbeten på startsidan (fas 2) kräver att mapphandtaget sparas mellan besöken, i webbläsarens IndexedDB. Det byggs i fas 2.

## B-23 · Store och sparande

**Status:** Beslutat

Store är appens enda källa för det öppna projektet. Den består av två delar:

| Fil | Innehåll |
|---|---|
| `src/lib/project/session.ts` | `ProjectSession`: projektet, sparstatusen och all logik. Ren TypeScript som testas utan webbläsare. |
| `src/lib/project/store.svelte.ts` | Ett tunt skal som kopierar sessionens värden till `$state`, så att vyerna ritas om. Startar autosparning och varning vid stängning. |

Regler:

- **Projektet ändras aldrig på plats.** `update(change)` ger en kopia att ändra i, och kopian blir det nya projektet. Då märker store varje ändring och markerar filen som osparad. Vyerna ändrar bara via store.
- **Nya ID:n skapas bara via `newId(kind)`.** `takeId` i `project.ts` är en ren funktion: den tar emot löpnumren och returnerar ID:t och nya löpnummer, utan att ändra något. Store sparar de nya löpnumren via `update`.
- **Ett ogiltigt projekt skrivs aldrig.** Före sparning kontrolleras projektet med `validateProject`. Vid fel skrivs ingenting, och sparstatusen visar felen med sökväg. `serializeProject` anropas dessutom i `try/catch`, så att ett oväntat fel också syns i stället för att försvinna.
- **Skrivfel syns.** Nekad behörighet, en borttagen mapp eller en full disk visas i sparstatusen, och ändringarna räknas fortfarande som osparade.
- **Ändringar under pågående sparning går inte förlorade.** Store håller ett ändringsnummer. Om projektet ändrades medan filen skrevs räknas det fortfarande som osparat efteråt.
- **Autosparning** sker var tionde minut, bara om något har ändrats och bara till en mapp, aldrig som nedladdning.
- **Varning vid stängning** (`beforeunload`) visas när det finns osparade ändringar.
- **Öppning** kontrollerar filen med `parseProject`. En ogiltig fil öppnas inte, och det öppna projektet lämnas orört. Avvikelser mot ramverket (`checkAgainstFramework`), till exempel en okänd kontroll, hindrar inte öppning men visas som varningar.

Sparstatusen har fem lägen: inget projekt, sparat, osparade ändringar, sparar och fel. `describeStatus` gör om den till text för sidhuvudet, till exempel "Sparat till exempelbolaget-ab.grc.json 14:42".

Reservkopia i webbläsaren mellan sparningarna: se B-25.

## B-24 · Versionsnummer och filnamn

**Status:** Beslutat

Beslutat 30 september 2026. Verktyget har ett versionsnummer i `package.json` av formen MAJOR.MINOR.PATCH (semantisk versionering). Första numrerade versionen är 0.1.0.

- **PATCH** (0.1.0 → 0.1.1): rättelser.
- **MINOR** (0.1.1 → 0.2.0): nya funktioner, till exempel en avslutad fas.
- **MAJOR** (0.x → 1.0.0): den skarpa versionen vid M4. Därefter höjs MAJOR om projektfilens format ändras på ett sätt som äldre verktyg inte kan läsa.

Den byggda filen döps efter versionen, till exempel `dist/GRC-verktyget-0.1.0.html`. Det görs som sista steg i `scripts/finalize-build.mjs` (`releaseFileName`):

- Versionen läses direkt ur `package.json` och kontrolleras först. En ogiltig version stoppar bygget innan något skrivs.
- Namnbytet sker sist, eftersom kontrollen att `dist/` bara innehåller en fil förutsätter att den heter `index.html`.
- Samma version visas i verktygets sidfot via `__APP_VERSION__` (`vite.config.ts`). Om versionen inte finns i den byggda filen, till exempel för att bygget startades utan npm, varnar skriptet.

Skäl: konsulterna ska kunna se vilken version de använder, och flera versioner ska kunna ligga sida vid sida utan att skriva över varandra. Källfilen heter fortfarande `index.html`, eftersom Vite och utvecklingsservern utgår från det namnet.

Rutinen för att dela ut en ny version till konsulterna (var filen läggs och hur de får veta) är inte bestämd, se TODO.md.

## B-25 · Reservkopia i webbläsaren

**Status:** Beslutat

Beslutat 5 oktober 2026. Varje ändring i ett projekt sparas också i webbläsarens localStorage, och kopian rensas när ändringarna säkert finns i en fil. Projektfilen är fortfarande det som gäller; reservkopian är ett skyddsnät.

Skäl: autosparningen sker var tionde minut, och i Safari och Firefox finns ingen autosparning till fil alls. Kraschar webbläsaren, eller stängs fliken trots varningen, skulle ändringarna sedan senaste sparningen annars gå förlorade.

Så fungerar det (`src/lib/storage/backup.ts`, `session.ts`):

- **Skrivs vid varje ändring.** `update()` och `start()` skriver hela projektet till localStorage, under nyckeln `grc-verktyget:reservkopia:<projektets id>`. Även ett ogiltigt projekt sparas, så att inget går förlorat.
- **Rensas vid sparning till mapp.** När filen är skriven (Chrome, Edge) tas kopian bort direkt.
- **Ligger kvar vid nedladdning.** I Safari och Firefox går det inte att veta om den nedladdade filen verkligen sparades; dialogen kan ha avbrutits. Kopian märks som nedladdad men ligger kvar, och rensas när den nedladdade filen öppnas igen och visar sig vara minst lika ny.
- **Ligger kvar vid fel.** Misslyckas sparningen, eller är projektet ogiltigt, finns ändringarna kvar i kopian.
- **Erbjuds vid öppning.** Öppnas en projektfil och kopian har nyare ändringar än filen (`changedAt` senare än filens `updatedAt`) frågar verktyget om de ska återställas. Ja ger ändringarna som osparade, så att de sparas till filen. Nej behåller filen och tar bort kopian.
- **Listas på startsidan.** Kopior som finns kvar visas under "Osparade ändringar i webbläsaren", med knapparna Återställ och Ta bort. Återställ fungerar även om filen saknas, till exempel om en nedladdning aldrig sparades.
- **Fungerar utan localStorage.** Om lagringen är avstängd (privat fönster, IT-policy) eller full fortsätter verktyget att fungera, och en ruta uppmanar konsulten att spara ofta.

Konsekvenser för B-02 (kunddata hos kunden): kunddata ligger i webbläsaren på konsultens dator mellan en ändring och nästa sparning. I Chrome och Edge rensas den inom tio minuter, eller direkt vid Spara. I Safari och Firefox ligger den kvar tills den nedladdade filen öppnats igen eller kopian tagits bort. I Chrome och Edge delar alla filer som öppnas från disk samma localStorage, så en annan lokal HTML-fil skulle i princip kunna läsa kopian. Det är en medveten avvägning mot risken att förlora arbete.

## B-26 · Senaste arbeten i IndexedDB

**Status:** Beslutat

Beslutat 5 oktober 2026, fas 2. Listan "Senaste arbeten" på startsidan sparas i webbläsarens IndexedDB (`src/lib/storage/recent.ts`), inte i localStorage.

Skäl: bara IndexedDB kan spara mapphandtag (`FileSystemDirectoryHandle`). Med handtaget kan "Fortsätt" öppna projektet igen utan att konsulten letar upp mappen. Webbläsaren frågar bara om behörigheten, en gång per besök.

Så fungerar det:

- **Innehåll:** projektets id, kund, ramverk, filnamn, när det sparades och användes, förlopp (bedömda av tillämpliga) och, för projekt i en mapp, mapphandtaget. Ingen bedömning; den finns bara i projektfilen.
- **Uppdateras** när ett projekt skapas, öppnas, återställs eller sparas (även av autosparningen). Högst 8 projekt, de äldsta tas bort.
- **Nedladdade projekt** (Safari, Firefox) har inget mapphandtag. Knappen heter då "Välj fil".
- **Flyttad eller borttagen fil** ger ett tydligt meddelande. "Ta bort" tar bara bort posten ur listan, aldrig filen.
- **Utan IndexedDB** (privat fönster, IT-policy) blir listan tom och resten av verktyget fungerar.

Konsekvenser för B-02: kundnamn och förlopp ligger i webbläsaren på konsultens dator tills posten tas bort eller trycks ut av nyare projekt. Det är samma avvägning som i B-25, men mindre känsligt, eftersom inga bedömningar sparas.


## B-27 · Regel för restrisk

**Status:** Beslutat · avgör O-03

Beslutat 7 oktober 2026: alternativ B i O-03 med alla fyra justeringarna. Både planerad och faktisk restrisk räknas fram ur kontrollerna; ingen av dem anges för hand.

1. **Grov skala för effektivitet.** Varje koppling mellan risk och kontroll får effektiviteten *Låg 0,25*, *Medel 0,5* eller *Hög 0,75* (fältet `effect` i `RiskControlLinkSchema`).
2. **Kontrollen sänker sannolikhet eller konsekvens, inte riskvärdet.** Kopplingen anges som *förebyggande* (sänker sannolikheten) eller *begränsande* (sänker konsekvensen), fältet `type`. Den sänkta nivån avrundas uppåt till närmaste hela nivå, lägst 1. Restrisken hamnar därför alltid i en ruta i matrisen.
3. **Status styr den faktiska effekten.** Planerad restrisk räknar med att alla kopplade kontroller är uppfyllda. Faktisk restrisk multiplicerar effektiviteten med en faktor för status: Uppfylld 1, Delvis uppfylld 0,5, Ej uppfylld 0, Ej bedömd 0.
4. **Flera kontroller kombineras som lager:** `1 − (1 − e₁) × (1 − e₂) × …`, separat för sannolikhet och konsekvens. Den sammanlagda effekten är högst 0,9.

Formeln, per sida (sannolikhet eller konsekvens):

```
nivå efter = max(1, avrunda uppåt(nivå före × (1 − sammanlagd effekt)))
restrisk   = konsekvens efter × sannolikhet efter
```

Konsekvenser:

- **Datamodellen:** fältet `planned` i `RiskSchema` tas bort, eftersom planerad restrisk räknas fram (B-17). En koppling utan `effect` eller `type` sänker ingenting, och riskregistret markerar den som ofullständig.
- **Avrundning:** värdet avrundas till sex decimaler innan det avrundas uppåt, som skydd mot flyttalsfel.
- **Metoden** (skala, faktorer och avrundning) står i riskmetoden och skrivs ut som bilaga i rapporten. Krav 6.1.2 kräver jämförbara och upprepbara riskbedömningar.

Exemplet i O-03 (R-004, K 4 × S 4, A.8.20 förebyggande Hög, Delvis uppfylld) ger planerad restrisk 4 och faktisk 12.

## B-28 · Bedömningsvyerna byggs i fas 2

**Status:** Beslutat · avgör O-05

Beslutat 7 oktober 2026: alternativ A i O-05. Fas 2 omfattar, utöver startsidan, flikarna i sidhuvudet, Grundkrav och Annex A med status per kontroll, SoA och en enkel översikt med uppfyllnadsgrad (README 4.2, 4.3, 4.7 och 4.8). M1 ligger kvar efter fas 2.

Skäl: utan vyerna går det inte att göra en gapanalys, och risk (fas 3) och åtgärder (fas 5) bygger på kontrollernas status. Dashboarden i fas 6 bygger vidare på översikten.

Byggt 7 oktober 2026. Det som README 4.7 och 4.8 beskriver men som hör till senare faser väntar: bifogad evidens och "saknar evidens" (fas 4), "Föreslå text från risker" och riskvärden vid kopplade risker (fas 3), åtgärder från kontroller (fas 5, O-04), utskrift av SoA (fas 8) och vem som senast ändrade (kräver konsultens namn, som saknas än). Till dess finns fältet "Evidens (var finns den?)", som sparas i `evidenceNote`.


## B-29 · Startsidans utformning, startpunkt och typrisker

**Status:** Beslutat

Beslutat 7 oktober 2026 utifrån Mateusz skiss av startsidan.

- **Utformning:** Nytt arbete är huvudkortet till vänster. Till höger finns Öppna befintligt arbete och Senaste arbeten. Sidhuvudet visar logga, namn och version; knapparna Bibliotek och Inställningar i skissen utelämnas tills det finns något att visa.
- **Startpunkt för riskregistret:** *Med typrisker* lägger in typriskerna i projektfilen redan när arbetet skapas. De syns i riskregistret när fas 3 är klar. *Tomt register* ger inga risker. *Kopiera från kund* byggs i fas 3 och visas som "kommer".
- **Typrisker** är data i `src/lib/risk/typrisker-iso27001.yaml`, med schema i `templates.ts`, på samma sätt som ramverket (B-04). Varje typrisk har förslag på kontroller med effektivitet och typ enligt B-27, men ingen konsekvens eller sannolikhet; de bedöms med kunden. Den första versionen har 15 risker skrivna av Claude och ska granskas och utökas av en senior ISO-konsult. En risk som skapats från en typrisk får typriskens ID i fältet `template`.
- **Dra och släpp:** i Chrome och Edge kan uppdragets mapp dras in och öppnas som vid val av mapp. En indragen fil öppnas utan mapp, och Spara ber då om mappen. I Safari och Firefox kan bara filen dras in.
- **Senaste arbeten** visar andelen bedömda kontroller i procent och en stapel delad i uppfylld, delvis och ej uppfylld. En nedladdad eller indragen fil ersätter inte en post som har mappen, så att "Fortsätt" fortsätter att fungera.


## B-30 · Riskregistret i fas 3

**Status:** Beslutat

Beslutat 7 oktober 2026, med förslagen i rapporten "Plan för fas 3".

- **Typrisker kan tas bort.** En risk tas bort ur registret efter en bekräftelse. ID:t återanvänds aldrig (B-17). Kontroller som bara var kopplade till risken låses upp i SoA. En borttagen typrisk kan importeras igen och får då ett nytt ID. Det löser frågan om att typrisker låser kontroller direkt: konsulten tar bort de typrisker som inte gäller.
- **Planerad restrisk anges inte för hand** (B-27). Fältet `planned` är borttaget ur `RiskSchema`; äldre filer med fältet läses ändå, eftersom okända fält ignoreras.
- **Godkännandet sparar restrisken** (`approval.residual`). Ändras den faktiska restrisken efteråt, till exempel för att en kontroll fått en annan status, visas godkännandet som inaktuellt och kan göras om.
- **Accepterade risker** behandlas inte, så deras restrisk är risken före behandling.
- **Ett konsekvensvärde per risk.** Konsekvenstyperna är beskrivningar som hjälper vid bedömningen.
- **Nyckeltal:** *över acceptansnivå* = risken före behandling är över acceptansnivån. *Restrisk ej uppnådd* = faktisk restrisk är högre än planerad. *Väntar på godkännande* = bedömd risk med beslutad behandling men utan giltigt godkännande.
- **Saknade uppgifter** markeras: ägare, bedömning, behandling och kopplingar utan effektivitet eller typ.
- **Historik** skrivs automatiskt när en risk skapas, bedöms, får ny behandling, kopplas eller godkänns. Textändringar skrivs inte, så att historiken inte fylls av varje tangenttryckning.
- **Kopiera från kund** tar riskmetoden och riskerna (namn, beskrivning, hot, sårbarhet, tillgångar och kopplingar) från en annan projektfil, men inte ägare, bedömningar, behandling eller godkännanden.
- **Riskmetoden** sparas i projektfilen först när konsulten ändrar något. Till dess gäller standardmetoden.

## B-31 · Evidens i fas 4

**Status:** Beslutat

Beslutat 12 oktober 2026. Koden finns i `lib/evidence/evidence.ts` (ren logik), `lib/storage/evidence-files.ts` (filerna i mappen) och `components/EvidenceList.svelte`.

| Fråga | Beslut | För | Emot |
|---|---|---|---|
| Var ligger filerna? | `evidens/<kontroll- eller risk-ID>/` bredvid projektfilen, t.ex. `evidens/A.8.5/policy.pdf`. | Kunden och revisorn hittar filen i SharePoint utan verktyget. Inga namnkrockar mellan kontroller. | En fil som styrker flera kontroller ligger bara i den första mappen (se återanvändning). |
| Samma fil två gånger? | Kontrollsumman (SHA-256) jämförs. Finns filen redan i projektet och är oförändrad pekar den nya referensen på den, och ingen kopia görs. Samma fil två gånger på samma kontroll nekas. | Ingen dubbellagring, och samma policy kan styrka tio kontroller. | Referensen pekar in i en annan kontrolls mapp. Godtaget, eftersom sökvägen syns i listan. |
| Namnkrock i mappen? | Ett ledigt namn väljs: `policy.pdf`, `policy (2).pdf` … En befintlig fil skrivs aldrig över. | Inget kan försvinna. | Namnen kan bli otydliga om samma namn används ofta. |
| Ta bort | Bara referensen tas bort. Filen ligger kvar i kundens mapp. | Verktyget raderar aldrig kunddata (principen *säkert*). Filen kan behövas för andra kontroller eller av kunden. | Mappen kan innehålla filer som inte längre används. Godtaget; kunden städar i SharePoint. |
| Största fil | 100 MB. Större filer läggs i mappen för hand och anges i fältet *Evidens på annan plats*. | Filen läses in i minnet för kontrollsumman; mycket stora filer gör webbläsaren långsam. | En gräns att förklara. Revisionsevidens är sällan så stor. |
| Webbläsare | Bifoga och öppna kräver mappåtkomst (Chrome, Edge). I nedladdningsläget (Safari, Firefox) visas listan och en förklaring, men inget kan bifogas. | Samma lösning som sparandet (B-22). Inget nytt lagringsställe. | Safari och Firefox kan inte bifoga. Godtaget, verktyget rekommenderar redan Chrome och Edge. |
| Kontroll av filerna | När en kontroll öppnas räknas kontrollsumman om för dess filer. Översikten har knappen *Kontrollera att de finns kvar* för alla filer. Ändrade och saknade filer markeras. | Uppfyller kravet att en ändrad eller flyttad fil ska synas (README 4.7). Ingen bakgrundsprocess. | Att öppna en kontroll med stora filer tar en stund. Kontrollen görs inte vid varje sparning. |
| Öppna | Filen öppnas i en ny flik som en `blob:`-adress. Blockeras fliken laddas filen ned. | Fungerar med CSP utan nätverk (B-20). Uppfyller "en revisor kan öppna evidensen direkt från kontrollen". | Vissa filtyper (Word, Excel) laddas alltid ned i stället för att visas. |
| "Saknar evidens" | En tillämplig kontroll som är *Uppfylld* eller *Delvis uppfylld* men saknar både bifogad fil och anteckning i *Evidens på annan plats*. | Det är det en revisor frågar efter. Ej bedömda och ej uppfyllda har inget att styrka. | En anteckning räknas som evidens fast den inte kan kontrolleras. Godtaget, all evidens kan inte bifogas. |
| Risker | Risker kan också ha evidens, t.ex. anteckningar från riskworkshopen. Det skrivs i riskens historik. | Underlag för 6.1.2 och 8.2. Samma komponent som för kontroller. | — |

**Rättat före fasen:** dubblerade ID:n i projektfilen rapporteras nu med den faktiska sökvägen, t.ex. `risks.0.evidence.0.id` (TODO.md).

**Vidareutveckling:** `source: 'automatic'` och `prepareEvidence` kan användas av en framtida import av fynd (B-33). En ny ägare av evidens, till exempel åtgärder i fas 5, kräver bara ett nytt värde i `EvidenceOwner`.

## B-32 · Konsultens namn sparas i webbläsaren

**Status:** Beslutat

Beslutat 12 oktober 2026. Evidens ska visa vem som lade till den (Plan 2.0). Namnet frågas första gången konsulten bifogar en fil och sparas i `localStorage` (`lib/storage/settings.ts`).

- **För:** inget nytt gränssnitt (Inställningar behövs inte än), och namnet är konsultens eget, inte kunddata.
- **Emot:** namnet följer webbläsaren, inte konsulten, och måste anges på varje dator. Godtaget.
- **Vidareutveckling:** samma namn kan fylla i `updated.by` och `history.by`, som idag är tomma (TODO.md, före fas 8).

## B-33 · Filformat för fynd från automatisk granskning

**Status:** Beslutat (formatet). Inläsningen byggs senare.

Beslutat 12 oktober 2026, som Plan 2.0 kräver i fas 4 (B-18). Schemat finns i `lib/cloud/findings.ts` och beskrivs i README avsnitt 5.

- **Formatet:** JSON med `format: "grc-fynd"`, `version: 1`, källa (verktyg, version, granskad miljö), tidpunkt och en lista med fynd. Varje fynd har kontroll-ID, status för den tekniska delen, rubrik, detaljer, resurs och filer med kontrollsumma.
- **Bara den tekniska delen.** Fynden påverkar `parts.technical`, aldrig den övergripande statusen, som konsulten sätter (B-18). `technicalStatus()` väljer den sämsta statusen per kontroll och listar okända kontroll-ID:n.
- **Inläsningen i gränssnittet väntar** tills det finns ett program som skriver filen. *För:* inget byggs som inte kan provas på riktigt. *Emot:* formatet kan behöva ändras när programmet byggs; då höjs `version`.
- **Varför en fil och inte ett API:** verktyget har ingen nätverksåtkomst (B-20) och kan inte skydda inloggningsuppgifter. Granskningsprogrammet skriver filen i uppdragets mapp, och verktyget läser den som vilken fil som helst.


## B-34 · Åtgärder föreslås och godkänns (O-04)

**Status:** Beslutat

Beslutat 14 oktober 2026 av Claude på Mateusz uppdrag, enligt rekommendationen i O-04. Koden finns i `lib/actions.ts`.

| Fråga | Beslut | För | Emot |
|---|---|---|---|
| Skapas eller föreslås? | **Föreslås.** Förslagen räknas fram ur kontrollernas status och riskernas restrisk och sparas aldrig. "Skapa åtgärd" gör ett förslag till en åtgärd med ID. | Ingen lista med halvfärdiga åtgärder, inga förbrukade ID:n, samma princip som andra beräknade värden (B-17). | Ett klick extra per brist. |
| Vad ger förslag? | Tillämpliga kontroller som är Delvis eller Ej uppfyllda, och risker vars faktiska restrisk är över acceptansnivån och som inte accepteras. Ett riskförslag tar med riskens bristande kontroller, så att de inte föreslås en gång till. | Riskbehandlingsplanen (6.1.3) får åtgärder per risk, och kontroller som behandlar risken samlas där. | En kontroll som hör till en risk syns inte som eget förslag. Den syns i riskförslaget. |
| När räknas en brist som omhändertagen? | När någon åtgärd, oavsett status, är kopplad till den. | Inga dubbletter, och ett aktivt beslut (Avbruten) respekteras. | En brist vars åtgärd är klar men som finns kvar föreslås inte igen. I stället varnar åtgärden "Klar, men bristen finns kvar". |
| Ändras underlaget? | En åtgärd tas aldrig bort eller stängs automatiskt. Den varnar "Underlaget är åtgärdat. Stäng åtgärden?". | Konsulten beslutar, och historiken finns kvar till jämförelsen i fas 7. | Konsulten måste stänga själv. |
| Ta bort? | Nej. Status **Avbruten** (`cancelled`, nytt värde i `ActionStatusSchema`). Avbrutna döljs i standardfiltret. | Historiken finns kvar. | En felskapad åtgärd ligger kvar som avbruten. |
| En åtgärd för flera brister? | Ett förslag kan läggas till en befintlig öppen åtgärd. En koppling kan tas bort. | "Inför MFA" kan täcka flera kontroller och risker. | Kopplingar läggs bara till via förslag, inte fritt. |
| Prioritet? | Valfritt fält `priority`: Hög, Medel eller Låg. Förslaget sätter Hög för risker och Ej uppfyllda, Medel för Delvis. | Ledningen ser vad som ska göras först. Gamla filer fungerar, fältet är valfritt. | — |

Schemaändringarna är bakåtkompatibla: gamla filer läses som förut.

## B-35 · Navigering mellan flikarna

**Status:** Beslutat

Beslutat 14 oktober 2026. Åtgärdsplanen, kontrollerna och riskerna länkar till varandra. Aktiv flik och vad som ska öppnas ligger i `lib/ui/nav.svelte.ts` (`nav.go`, `nav.show`).

- **För:** komponenter långt ned i trädet (en åtgärd, en kontroll) kan länka utan att funktioner skickas genom alla mellanliggande komponenter. Nya flikar läggs till på ett ställe.
- **Emot:** ett delat tillstånd till. Det nollställs när ett projekt öppnas.
- **Avsnittens ID:n** är också flik-ID:n. Ramverksschemat avvisar avsnitt som heter som en fast flik (`RESERVED_SECTION_IDS`), så att ett nytt ramverk inte kan krocka.

## B-36 · Vem som ändrade

**Status:** Beslutat

Beslutat 14 oktober 2026. Konsultens namn (B-32) skrivs i `updated.by` på kontroller och i `history.by` på risker. Ändringsfunktionerna i `lib/` hämtar namnet själva via `consultantName()`.

- **För:** inga extra parametrar i ett tjugotal funktioner, och namnet finns överallt där det behövs. I testerna finns ingen localStorage, och namnet blir tomt.
- **Emot:** funktionerna läser en inställning i webbläsaren och är därför inte helt rena. Godtaget, eftersom det bara gäller ett textfält.
- **Namnet anges** på översikten (kortet Projekt) eller första gången en fil bifogas. Det visas i sidfoten på kontrollen, i riskhistoriken och i rapporternas sidhuvud.

## B-37 · Dashboard och "redo för revision"

**Status:** Beslutat

Beslutat 14 oktober 2026 (fas 6). Översikten är dashboarden och kan skrivas ut som en lägesbild på en sida. "Redo för revision" räknas i `lib/dashboard.ts`.

- **Delar:** bedömda, grundkrav uppfyllda, tillämpliga kontroller uppfyllda, evidens för uppfyllda, motiverade SoA-bortval, behandlade och godkända risker, brister med planerad åtgärd. Delar utan innehåll (till exempel inga bortval) räknas inte. Risker räknas alltid, eftersom en certifiering kräver en riskbedömning.
- **Helhet:** medelvärdet av delarna. **Redo** = minst 90 % och alla grundkrav uppfyllda. **Nära** = minst 70 %. Annars **Inte redo**.
- **För:** varje del går att förklara och följs av en länk till det som återstår. Grundkraven (kapitel 4–10) är obligatoriska vid certifiering, därav kravet.
- **Emot:** lika vikt för alla delar är en förenkling, och 90 % är ett valt tröskelvärde. Delarna visas alltid, så att ingen behöver lita på bara en siffra.
- **Generellt:** grundkrav är avsnitt utan SoA och kontroller är avsnitt med SoA, så samma regel fungerar för andra ramverk.

## B-38 · Uppföljning och jämförelse

**Status:** Beslutat

Beslutat 14 oktober 2026 (fas 7). Koden finns i `lib/compare.ts`, `followUp()` i `project.ts` och vyn `FollowUpView.svelte`.

| Fråga | Beslut | För | Emot |
|---|---|---|---|
| Hur startar nästa bedömning? | "Starta nästa bedömning" kopierar hela projektet till en ny fil med nytt `id`, `previousId` och dagens datum i filnamnet. | Allt behåller sina ID:n, så jämförelsen blir exakt. Konsulten uppdaterar i stället för att börja om. | Inaktuella kommentarer följer med och måste ses över. |
| Vad nollställs? | Bara godkännanden av restrisk. Historiken får en rad. | Riskägaren ska godkänna på nytt varje period. | — |
| Evidens? | Referenserna följer med. Den nya filen sparas i samma mapp, så filerna hittas. | Ingen kopiering av filer. | Sparas den nya filen i en annan mapp markeras evidensen som saknad. |
| Vad jämförs? | Kontroller (förbättrade, försämrade, nybedömda, inte längre bedömda), SoA, risker (nya, borttagna, ändrad faktisk restrisk), åtgärder (avslutade, nya, försenade) och ny evidens. | Täcker tabellen i Plan 2.0. | — |
| Var finns den tidigare filen? | Bara i minnet, tills projektet stängs. | Inget nytt sparas, ingen risk att filerna blandas ihop. | Filen väljs igen nästa gång. |
| Olika filer? | Olika ramverk kan inte jämföras. Annan kund, fel ursprung eller omvänd ordning ger en varning. | Fel jämförelse upptäcks. | — |

## B-39 · Rapporter: PDF, Word och Excel

**Status:** Beslutat

Beslutat 14 oktober 2026 (fas 8). Rapporterna är Svelte-komponenter i `components/reports/` och förhandsvisas i fliken Rapporter.

| Fråga | Beslut | För | Emot |
|---|---|---|---|
| PDF | Webbläsarens utskrift ("Spara som PDF"). `PrintHost` ritar rapporten direkt under `body`, och resten av sidan döljs vid utskrift. | Inget bibliotek, inget nätverk, fungerar med CSP (B-20). | Sidbrytningar styrs av webbläsaren. |
| Word | HTML-dokument med rapportens CSS, nedladdat som `.doc`. Word öppnar och kan redigera det. | Konsulten kan anpassa texten före leverans, utan ett stort bibliotek i filen. | Inte en äkta .docx. Word kan visa en fråga om formatet. Utseendet blir enklare än i PDF. |
| Excel | CSV med semikolon, BOM och CRLF för kontroller, risker och åtgärder. Värden som börjar med = + - @ får en apostrof först. | Öppnas direkt i svenska Excel. Skyddar mot formelinjektion från fritext. | Ingen formatering. |
| Layout | Gemensam CSS (`lib/report/style.ts`) och sidhuvud med Method IT, kund, ramverk, datum, konsult och version. | Samma utseende i alla rapporter och i Word. | Logotypen var text. *Ändrat i B-42: nu Method-logotypen som bild.* |
| Innehåll | Komplett rapport, lägesbild, gapanalys, SoA, riskbehandlingsplan med riskmetoden som bilaga, progressrapport. | Täcker Plan 2.0 fas 8 och README 4.10. SoA kan skrivas ut separat (6.1.3 d). | — |

## B-40 · Uppdragsuppgifter i projektfilen

**Status:** Beslutat

Beslutat 14 oktober 2026. Rapporterna behöver konsultens sammanfattning, omfattning och deltagare. Nytt valfritt fält `engagement: { scope, participants, summary }` i projektfilen, redigerat på översikten.

- **För:** rapporten blir komplett utan efterarbete i Word, och uppgifterna följer med vid uppföljning.
- **Emot:** fler fält på översikten. De är valfria och visas bara i rapporten när de är ifyllda.

## B-41 · Version 0.8.0, instruktion och gemensamma hjälpfunktioner

**Status:** Beslutat

Beslutat 14 oktober 2026.

- **Version 0.8.0** i `package.json` och `package-lock.json`: en MINOR per fas enligt B-24 (fas 8 → 0.8). 1.0.0 sätts vid M4, efter kundtestet. Det löser att `package.json` och `package-lock.json` hade olika versioner.
- **Instruktionen** finns i verktyget (länken Instruktion i sidfoten), inte bara i README, eftersom konsulterna inte läser repot.
- **Kodkvalitet.** Upprepad kod samlades i hjälpfunktioner:
  - `allControls` och `controlTitles` (ramverk)
  - `nextId` och `emptyAnswer` (projekt)
  - `isDeficient` och `totalAttention` (bedömning)
  - `downloadFile` (nedladdning)
- **Ny utbyggnad** behöver då bara ändras på ett ställe, och logiken utgår från ramverkets avsnitt i stället för ISO-specifika ID:n.
- **Prestanda.** Obedömda kontroller delar en fryst standardbedömning i stället för att skapa en ny vid varje uppslag. Bifogade filer kontrolleras bara när listan ändras.
- **Kommentarer:** en kommentar överst i varje fil och korta kommentarer på huvudfunktionerna.
- **DATAFLOW.md:** kartan över beroenden och dataflöde ligger i repot, som den fjärde dokumentationsfilen.


## B-42 · Logotyp, större text och rymligare fält

**Status:** Beslutat

Beslutat 15 oktober 2026.

- **Logotyp:** `src/lib/ui/logo.jpg` (Method, vit text på svart) visas i sidhuvudet och i rapporternas sidhuvud. Den importeras och bäddas in i HTML-filen som `data:`-adress, vilket CSP redan tillåter (`img-src data:`). Sidhuvudet är svart, så att logotypens bakgrund smälter in. Bilden beskärs med `object-fit` till texten. *För:* ingen ny fil bredvid verktyget. *Emot:* filen blir 16 kB större.
- **Text:** grundstorleken är 16 px i stället för 15, och alla mindre storlekar är 1 px större. Länkknappar (`button.link`) är större och har lite luft.
- **Översikten:** tre kolumner där korten staplas, så att det inte blir luckor: redo för revision och åtgärder, uppfyllnad och riskprofil, avsnitt och det som behöver uppmärksamhet. Projektkortet går över hela bredden med fälten i två kolumner. På smalare skärmar blir det två kolumner och sedan en.
- **Textfält:**
  - Textrutorna växer med innehållet (`field-sizing: content` i Chrome och Edge) och kan bara dras ut på höjden. Då kan de inte längre skjuta ut över grannfältet.
  - I riskdetaljen har hot och sårbarhet var sin rad i full bredd.
  - I Safari och Firefox gäller antalet rader som förut.


## B-43 · Förbättringar i gränssnittet inför testningen

**Status:** Beslutat

Beslutat 15 oktober 2026.

- **Menyknapp i stället för rullista.** "Lägg till i …" och "+ Lägg till konsekvenstyp" använder samma komponent (`MenuButton.svelte`). Den öppnar en lista som stängs vid val, med Esc eller vid klick utanför. *För:* ser likadan ut som verktygets andra knappar, visar hela rubriken och ansvarig, och kan återanvändas. *Emot:* en egen komponent i stället för webbläsarens rullista.
- **Konsekvenstyper att välja bland:** Människa och Hälsa, Miljö, Förtroende och Varumärke, Lagar och Regler (Compliance), eller en egen typ. (Ekonomi och Tillgångar samt Verksamhet och Drift togs bort 15 okt 2026; standardmetoden täcker dem redan med "Verksamhet och ekonomi".) Listan finns i `CONSEQUENCE_CATEGORIES` i `risk/rules.ts`. Standardmetodens två typer är oförändrade.
- **Klar vid acceptans och fastställande.** Ändringarna sparas fortfarande direkt. Klar kräver vem som fastställt metoden, sätter dagens datum om det saknas och visar uppgifterna som text tills konsulten trycker Ändra.
- **Statusfärger för åtgärder:** Ej påbörjad grå, Pågår blå (ny färg `--blue`), Klar grön, Avbruten röd. Samma färger i statusknapparna.
- **Ta bort uppdelningen** i teknisk och organisatorisk del (`clearParts`), med en fråga om delarna har värden.
- **Rullistor** har samma stil som textfälten.
- **Kortet "Så räknas restrisken" är borttaget** från riskmetoden, eftersom användarna redan kan regeln. Regeln står kvar i B-27 och i rapporternas bilaga.


## B-44 · Avskalade texter i gränssnittet

**Status:** Beslutat

Beslutat 18 oktober 2026.

- **Förklarande texter är borttagna.** Användarna är konsulter som kan gapanalys, och instruktionen finns i sidfoten. Borttaget: startsidans ingress, ramverkens beskrivningar (`description` i `frameworks/index.ts`), raden "Inget lagras hos Method IT", förklaringen av redo för revision, hjälptexter om sparande och namn på översikten, samt hjälptexter i åtgärdsplanen, riskvyerna, uppföljningen, rapporterna och evidensen.
- **Kvar finns det som påverkar arbetet:** antal, status, tomma listor, varningar och fel, samt notiser om webbläsaren inte kan spara i en mapp.
- **Kortare etiketter:** omdömet för redo för revision är Redo, Nära eller Inte redo. Rapporternas beskrivningar är några ord.
- *För:* lugnare vyer och snabbare att läsa. *Emot:* en ny användare behöver öppna instruktionen. Det är godtagbart eftersom verktyget används av ett fåtal konsulter.


## B-45 · CIS Azure-benchmarks som data, utan CIS-texter

**Status:** Beslutat

Beslutat 20 oktober 2026.

- **Fyra filer** i `src/lib/benchmarks/`, en per benchmark och version: Azure Foundations 6.0.0 (127 rekommendationer), Compute 2.0.0 (99), Database 2.0.0 (49) och Storage 2.0.0 (64). En fil per benchmark eftersom de får nya versioner var för sig.
- **Innehåll per rekommendation:** CIS-ID, egen svensk rubrik, nivå (1 eller 2), automatiserad eller manuell, lägsta implementeringsgrupp, skyddsåtgärder i CIS Controls v8 och ID för inbyggda Azure Policy-definitioner. Avsnitten har egna svenska rubriker.
- **Inga CIS-texter.** Beskrivning, motivering, granskning och åtgärd ingår inte. De fria PDF:erna har licensen CC BY-NC-SA 4.0 (bara icke-kommersiell användning). Ett test kontrollerar att filerna bara innehåller de tillåtna fälten.
- **Plats för egna texter:** schemat har det valfria fältet `remediation` för en egen kort åtgärdstext. Det fylls senare. Rekommendationerna kopplas inte till ISO 27001 (B-46).
- **Används inte i appen än.** Filerna valideras med zod i testerna (`schema.ts`). De kopplas in när importen från Prowler och Defender for Cloud byggs (O-07).
- **Hur filerna togs fram:** ur PDF:erna med ett skript som ligger utanför repot (`Claude outputs/`), eftersom det kräver PDF:erna. Siffrorna kontrollerades mot bilagorna i PDF:erna. *För:* snabbt och spårbart. *Emot:* en ny version kräver att skriptet körs igen och att rubrikerna översätts.


## B-46 · Ett ramverk per projekt, ingen korsmappning

**Status:** Beslutat

Beslutat 20 oktober 2026.

- **Varje ramverk är ett eget arbete.** En gapanalys mot ISO 27001 och en mot CIS Controls är två projekt med var sin projektfil, även för samma kund. Det följer hur verktyget redan fungerar: ett ramverk per arbete.
- **Ingen korsmappning i verktyget.** Kontroller i ett ramverk kopplas inte till kontroller i ett annat, och CIS-rekommendationer kopplas inte till Annex A. Konsulten jämför projekten själv om det behövs.
- *För:* enklare datamodell och inga mappningar att underhålla när ramverken får nya versioner. Varje bedömning står för sig och kan granskas för sig. *Emot:* en kontroll som finns i båda ramverken bedöms två gånger.
- Ersätter förslaget om korsmappning i rapporten "Funktioner, ramverk och CloudSecComp" (20 okt 2026).


---

## Öppna frågor

### O-01 · Hur verktyget sparar till fil

**Förslag:** Använd File System Access API (`showSaveFilePicker`). Då kan verktyget spara automatiskt till samma fil i kundens synkade SharePoint-mapp. *(Senare ändrat till val av mapp i stället för fil, se B-22.)*

**Problem:** API:t finns bara i Chrome och Edge, och det fungerar inte i Safari eller Firefox.

**Reserv:** Om API:t saknas används "Spara" som laddar ned filen, plus en varning om osparade ändringar.

**Beslut behövs om:** Vi kräver Chrome/Edge, eller erbjuder båda lägena.

**Avgjord 25 september 2026 (Plan 2.0, fas 1):** Båda lägena. Chrome och Edge skriver direkt till filen i kundens SharePoint-mapp. I Safari och Firefox laddas filen ned i stället, och verktyget rekommenderar Chrome eller Edge. Autosparning sker var tionde minut, men bara när något har ändrats. Sparstatusen visas alltid, och stängning med osparade ändringar ger en varning.

### O-02 · Numreringen i kapitel 6 följer inte standarden

**Avgjord 25 september 2026:** ID:n följer standarden, se B-15.

Grundkraven 6.1–6.6 är numrerade i löpordning. I standarden heter de 6.1.1, 6.1.2, 6.1.3, 6.1.3 d, 6.2 och 6.3. För att kunna koppla ihop ramverk bör ID:n följa standarden.

Ändringen påverkar översättningen av gamla sparfiler (B-11). Den görs som en egen commit, med en tabell som översätter gamla ID:n till nya.

### O-03 · Regel för faktisk restrisk

**Avgjord 7 oktober 2026:** alternativ B med justeringarna 1–4, se B-27.

Riskregistret visar två restrisker: den *planerade* (när alla åtgärder är genomförda) och den *faktiska* (utifrån hur kontrollerna faktiskt är uppfyllda just nu). Regeln för uträkningen behöver bestämmas innan riskregistret byggs. Två alternativ finns.

**Alternativ A · Steg i sannolikhet**

Planerad restrisk anges för hand. Faktisk restrisk är lika med planerad när alla kopplade kontroller är *Uppfyllda*. Annars ökar sannolikheten ett steg för varje kontroll som är *Delvis* uppfylld och två steg för varje kontroll som är *Ej uppfylld*, men aldrig över sannolikheten före behandling.

- **Fördel:** enkelt att förklara för kund och revisor.
- **Nackdel:** alla kontroller väger lika tungt, och planerad restrisk blir en bedömning utan koppling till kontrollerna.

**Alternativ B · Kontrollens effektivitet (förslag från Mateusz)**

Varje koppling mellan en risk och en kontroll får i förväg en effektivitet mellan 0 och 1, alltså hur mycket kontrollen minskar risken när den är fullt genomförd. Då gäller:

```
Restrisk = Risk × (1 − effektivitet)
```

- **Fördel:** både planerad och faktisk restrisk räknas fram, och viktiga kontroller väger tyngre.
- **Nackdel:** risk för skenbar precision, och ett resultat som 15 × (1 − 0,75) = 3,75 går inte att placera i matrisen.

**Rekommendation: alternativ B, med fyra justeringar**

1. **Grov skala i stället för fritt tal.** Effektiviteten väljs som *Låg 0,25*, *Medel 0,5* eller *Hög 0,75*. Det är lättare att motivera för en revisor än till exempel 0,62.
2. **Minska sannolikhet eller konsekvens, inte riskvärdet.** Vid kopplingen anges om kontrollen är *förebyggande* (sänker sannolikheten) eller *begränsande* (sänker konsekvensen). Värdet avrundas uppåt till närmaste hela nivå, lägst 1. Då hamnar restrisken alltid i en ruta i matrisen, och avrundningen uppåt gör bedömningen försiktig.
3. **Status styr den faktiska effekten.** Samma effektivitet används för båda restriskerna. Skillnaden är att planerad restrisk räknar med att alla kontroller är uppfyllda, medan faktisk restrisk multiplicerar effektiviteten med en faktor för status:

   | Status | Faktor |
   |---|---|
   | Uppfylld | 1 |
   | Delvis uppfylld | 0,5 |
   | Ej uppfylld | 0 |
   | Ej bedömd | 0 |

4. **Flera kontroller på samma risk kombineras som lager:** `1 − (1 − e₁) × (1 − e₂) × …`. Den sammanlagda effekten begränsas till högst 0,9, så att ingen risk kan räknas ned till noll.

**Exempel (R-004 i skisserna):** före behandling är K 4 × S 4 = 16. A.8.20 är kopplad som förebyggande med effektiviteten *Hög (0,75)*.

| | Effekt | Sannolikhet | Restrisk |
|---|---|---|---|
| Planerad | 0,75 | 4 × 0,25 = 1 | 4 × 1 = **4** |
| Faktisk, A.8.20 *Delvis* | 0,75 × 0,5 = 0,375 | 4 × 0,625 = 2,5 → **3** | 4 × 3 = **12** |

Skisserna visar samma värden, 4 och 12.

Metoden (skala, faktorer och avrundning) ska stå i riskmetoden och skrivas ut som bilaga i rapporten. Krav 6.1.2 kräver att riskbedömningar ger jämförbara och upprepbara resultat.

**Beslut behövs om:**

- Vi väljer alternativ A eller B.
- Justeringarna 1–4 gäller, om vi väljer B.

### O-04 · Hur åtgärder skapas och hanteras

**Avgjord 14 oktober 2026:** rekommendationerna 1–4, se B-34.

*Måste avgöras före fas 5 (åtgärdsplan). Datamodellen (B-17) klarar alla alternativen nedan, eventuellt med ett nytt valfritt fält.*

Plan 2.0 och README beskriver vad åtgärdsplanen ska visa, men inte hur åtgärderna uppstår och vad som händer när underlaget ändras. README säger på ett ställe att en åtgärd *skapas* automatiskt när en kontroll sätts till Delvis eller Ej uppfylld (4.7), och på ett annat att den *föreslås* (4.9). Fyra frågor behöver besvaras.

**1 · Skapas åtgärden automatiskt eller föreslås den?**

- *Skapas direkt:* varje brist blir genast en åtgärd med eget ID. Enkelt, men listan fylls med halvfärdiga åtgärder utan ansvarig och deadline, och ID:n förbrukas på åtgärder som sedan tas bort.
- *Föreslås:* en brist ger ett åtgärdsförslag som syns vid kontrollen och i åtgärdsplanen. Först när konsulten godkänner förslaget blir det en åtgärd med ID, ansvarig och deadline.

**2 · Vad händer när underlaget ändras?**

Till exempel när en kontroll först sätts till Ej uppfylld och sedan till Uppfylld, eller när en risk sänks under acceptansnivån. Ska åtgärden tas bort, stängas eller ligga kvar? Om statusen ändras fram och tillbaka får det inte uppstå dubbletter.

**3 · En åtgärd för flera brister?**

Datamodellen tillåter redan att en åtgärd kopplas till flera kontroller och risker (`controls` och `risks` i `ActionSchema`). Det som saknas är hur konsulten gör det i gränssnittet, till exempel slår ihop två förslag eller kopplar ett förslag till en befintlig åtgärd.

**4 · Behövs prioritet?**

Åtgärder har deadline men ingen prioritet. En ledning som ska välja vad som görs först kan behöva det.

**Rekommendation**

1. **Förslag, inte automatiska åtgärder.** Förslagen räknas fram ur kontrollernas status och riskernas värden och sparas aldrig i projektfilen, på samma sätt som andra beräknade värden (B-17). Bara godkända åtgärder sparas och får ett ID.
2. **En godkänd åtgärd tas aldrig bort automatiskt.** Om underlaget blir uppfyllt, eller risken hamnar under acceptansnivån, markeras åtgärden med "Underlaget är åtgärdat, stäng?" och konsulten beslutar. Ett förslag visas inte för en brist som redan har en åtgärd, så dubbletter kan inte uppstå. Åtgärder som inte längre behövs får status *Avbruten* i stället för att tas bort, så att historiken finns kvar till jämförelsen i fas 7. Det kräver ett nytt värde, `cancelled`, i `ActionStatusSchema`.
3. **Koppla till befintlig åtgärd.** När konsulten godkänner ett förslag kan det bli en ny åtgärd eller kopplas till en befintlig. Då kan en åtgärd, till exempel "Inför MFA", täcka flera kontroller och risker.
4. **Valfri prioritet: Hög, Medel eller Låg.** Verktyget föreslår en prioritet: Hög för risker över acceptansnivån och för kontroller som är Ej uppfyllda, Medel för Delvis uppfyllda. Konsulten kan ändra den. Det kräver ett nytt valfritt fält, `priority`, i `ActionSchema`.

**Beslut behövs om:**

- Förslag eller automatiska åtgärder (fråga 1).
- Rekommendationerna 2–4 gäller, eller ändras.

### O-05 · Bedömningsvyerna saknas i faserna

**Avgjord 7 oktober 2026:** alternativ A, se B-28. Upptäckt vid kontrollen mot målet 5 oktober 2026.

Målet är ett komplett verktyg för gapanalyser, och M1 (efter fas 2) säger att verktyget ersätter dagens. Men ingen fas i Plan 2.0 bygger vyerna där själva bedömningen görs: Grundkrav och Annex A med status per kontroll (README 4.7), SoA (4.8), Översikt (4.3) och sidhuvudets flikar (4.2). I den ursprungliga planen skulle de flyttas från det gamla verktyget, men det föll bort när vi bestämde att bygga ett nytt verktyg (B-16). Utan dem går det att skapa och spara ett projekt, men inte att göra en gapanalys.

Kontrollen mot målet i övrigt:

- **Allt i ett:** datamodellen (B-17) rymmer redan kontroller, SoA, risker, åtgärder och evidens i samma projektfil.
- **Enkelt:** en HTML-fil, ingen installation, filen i kundens mapp.
- **Säkert:** CSP utan nätverksåtkomst (B-20), ogiltiga projekt skrivs aldrig.
- **Modulärt:** ramverk är data (B-04), logiken ligger i `lib/` och är testad, startsidan räknar utifrån ramverkets avsnitt.
- **Molnsynk mot t.ex. Azure:** grunden finns (B-18): fasta kontroll-ID:n, `parts.technical` och `evidence.source`. Själva synken väntar på ett skrivbordsprogram som skriver en fil med fynd som verktyget läser in (fas 4).

**Alternativ:**

- *A · Lägg vyerna i fas 2,* före M1. Fas 2 blir större men M1 stämmer.
- *B · Ny fas 2b* mellan fas 2 och 3, och flytta M1 dit.
- *C · Flytta M1* till efter fas 5 och bygg vyerna i fas 3.

**Rekommendation:** A. Grundkrav, Annex A och SoA är det konsulten arbetar i varje dag, och risk (fas 3) och åtgärder (fas 5) bygger på kontrollernas status. En enkel Översikt med uppfyllnadsgrad räcker till M1; dashboarden i fas 6 bygger vidare på den. `lib/compliance.ts` är redan förberedd för det.

**Beslut behövs om:** alternativ A, B eller C.

### O-06 · Rutin för att dela ut nya versioner

*Bör avgöras före M4.* Den byggda filen heter `GRC-verktyget-<version>.html` (B-24), men det är inte bestämt hur konsulterna får den.

- **Var ligger filen?** Förslag: en gemensam SharePoint-mapp "GRC-verktyget" med en undermapp per version. Den senaste ligger också överst som `GRC-verktyget.html`.
- **Hur får konsulterna veta?** Förslag: ett kort meddelande i teamets kanal med vad som är nytt, hämtat ur ARCHITECTURE.
- **Gamla versioner?** Förslag: de ligger kvar. Projektfilerna är bakåtkompatibla inom samma MAJOR-version (B-24), så en äldre fil kan alltid öppnas i en nyare version.

**Beslut behövs om:** plats, kanal och om gamla versioner ska ligga kvar.

### O-07 · Import från granskningsverktyg (Lynis, OpenSCAP, CIS-CAT Lite)

*Efter M4.* Tre verktyg kan ge underlag för den tekniska delen av kontrollerna (`parts.technical`, B-18) utöver molngranskningen. Uppgifterna nedan om verktygen ska kontrolleras innan något byggs.

| Verktyg | Vad det granskar | Resultat |
|---|---|---|
| **Lynis** (CISOfy, öppen källkod) | Härdning av Linux, macOS och Unix | Textfil med nyckel och värde (`lynis-report.dat`): varningar, förslag och ett härdningsindex |
| **OpenSCAP** (`oscap`) | Främst Linux, mot profiler i SCAP Security Guide, t.ex. CIS och PCI DSS | XML (XCCDF- eller ARF-resultat) per regel. En del regler har referenser till ISO 27001:2013 |
| **CIS-CAT Lite** (CIS, gratis) | Ett urval av CIS Benchmarks, t.ex. Windows och macOS | Rapport i HTML. Maskinläsbara format finns troligen bara i CIS-CAT Pro |

- **Samma väg som molnfynden:** resultaten översätts till filformatet `grc-fynd` (B-33). Då behöver verktyget bara en inläsning, och fynden påverkar aldrig den övergripande statusen.
- **Mappning:** fynden kopplas till kontrollerna i det ramverk projektet gäller, inte mellan ramverk (B-46). För CIS-baserade granskningar räcker CIS-ID:t i verktygets resultat. För andra ramverk behövs en mappningstabell per verktyg.
- **Var översättningen görs:** filerna är lokala, så översättningen kan göras i verktyget utan nätverk (B-20) eller av ett litet separat skript. Det bestäms när den första importen byggs.
- **CIS-CAT Lite:** om bara HTML finns blir importen skör. Pröva först om Pro-licens eller manuell evidens räcker.

**Beslut behövs om:** vilket verktyg som byggs först (förslag: OpenSCAP, eftersom det ger XML per regel), och var översättningen görs.
