# GRC-verktyget

Method IT:s verktyg för gap-analys och riskarbete enligt ISO/IEC 27001:2022. Konsulten använder det tillsammans med kunden och går igenom tre delar:

- **Riskbedömning:** först bestäms riskmetoden, sedan byggs riskregistret upp.
- **Krav och kontroller:** alla krav och kontroller bedöms, och en SoA tas fram.
- **Resultat:** en åtgärdsplan och en rapport.

Verktyget är en fristående webbapp utan server. Varje kunduppdrag sparas som en projektfil i kundens egen mapp, och ingenting lagras hos Method IT.

Det är ett nytt verktyg, byggt från grunden. Det gamla enfilsverktyget (`legacy/method-grc-verktyg.html`) är förebild för innehåll och arbetssätt, men dess sparfiler går inte att öppna i det nya (ARCHITECTURE B-16).

> **Designbeslut** och skälen bakom dem finns i [ARCHITECTURE.md](ARCHITECTURE.md). Läs den först när du tar upp arbetet på en ny dator. Planen med faser och milstolpar (Plan 2.0) hålls utanför repot.

**Innehåll**

1. [Kom igång](#1-kom-igång)
2. [Projektstruktur](#2-projektstruktur)
3. [Hur verktyget är uppbyggt](#3-hur-verktyget-är-uppbyggt)
4. [Funktioner](#4-funktioner)
5. [Projektfilens format](#5-projektfilens-format)
6. [Lägga till ett nytt ramverk](#6-lägga-till-ett-nytt-ramverk)
7. [Arbetssätt](#7-arbetssätt)
8. [Faser](#8-faser)

---

## 1. Kom igång

Du behöver Node 24 (se `.nvmrc`). Med nvm räcker det att köra `nvm use` i projektmappen.

```bash
npm install          # installerar exakt de versioner som står i package-lock.json
npm run dev          # startar utvecklingsservern på http://localhost:5173
npm test             # kör alla tester en gång
npm run test:watch   # kör om testerna vid varje ändring
npm run check        # typkontroll (Svelte + TypeScript)
npm run build        # bygger verktyget till en enda fil: dist/GRC-verktyget-<version>.html
npm run preview      # visar det byggda verktyget, på http://localhost:4173/GRC-verktyget-<version>.html
```

`npm run build` gör två saker: Vite bygger och bäddar in allt i `dist/index.html`, och sedan kontrollerar `scripts/finalize-build.mjs` att filen är fristående, lägger in en säkerhetspolicy och döper om filen efter versionen, till exempel `dist/GRC-verktyget-0.1.0.html` (ARCHITECTURE B-03, B-20 och B-24). Det är den filen som delas ut till konsulterna. Den går att öppna direkt från disk, utan server och utan nät.

### Ny version

Versionen står i `package.json` och följer formen MAJOR.MINOR.PATCH:

| Kommando | Exempel | När |
|---|---|---|
| `npm version patch` | 0.1.0 → 0.1.1 | Rättelser |
| `npm version minor` | 0.1.1 → 0.2.0 | Nya funktioner, till exempel en avslutad fas |
| `npm version major` | 0.2.0 → 1.0.0 | Skarp version (M4) |

`npm version` uppdaterar `package.json` och `package-lock.json` och skapar en commit och en git-tagg, till exempel `v0.2.0`. Lägg till `--no-git-tag-version` för att bara ändra numret. Kör sedan `npm run build`. Versionen syns i filnamnet och i verktygets sidfot.

## 2. Projektstruktur

Filer markerade med ✅ finns redan. Resten är målbilden som byggs upp fas för fas.

```
grc-tool/
├── ARCHITECTURE.md                   ✅ designbeslut
├── DATAFLOW.md                       ✅ beroenden och dataflöde
├── TODO.md                           ✅ småfix och det som ska provas
├── README.md                         ✅ den här filen
├── index.html                        ✅ HTML-mallen som Vite bygger från
├── package.json / package-lock.json  ✅
├── vite.config.ts                    ✅ Svelte, YAML-import, bygge till en fil
├── legacy/method-grc-verktyg.html    ✅ det gamla verktyget, bara som referens
├── scripts/
│   ├── extract-framework.mjs         ✅ engångsskript: gamla HTML-verktyget → YAML
│   └── finalize-build.mjs            ✅ kontroll av bygget + CSP (körs av npm run build)
├── tests/fixtures/                   ✅ påhittade projektfiler för tester
└── src/
    ├── main.ts / App.svelte          ✅ startpunkt: sidhuvud med sparstatus, visar startsidan eller projektet
    ├── app.css                       ✅ grundstil, färger från det gamla verktyget
    ├── yaml.d.ts / globals.d.ts      ✅ typning av *.yaml-importer och byggkonstanter
    ├── lib/
    │   ├── frameworks/               ✅ ramverk som data
    │   │   ├── schema.ts             ✅ zod-schema för alla ramverk
    │   │   ├── iso27001-2022.yaml    ✅ 26 grundkrav + 93 Annex A-kontroller
    │   │   ├── iso27001.test.ts      ✅
    │   │   ├── index.ts              ✅ register över tillgängliga och kommande ramverk
    │   │   └── index.test.ts         ✅
    │   ├── project/                  ✅ projektfilen (.grc.json)
    │   │   ├── schema.ts             ✅ zod-schema för projektfilen
    │   │   ├── project.ts            ✅ skapa, läsa in, skriva ut, kontrollera mot ramverk
    │   │   ├── project.test.ts       ✅
    │   │   ├── session.ts            ✅ store-logiken: projekt, sparstatus, spara, autospara
    │   │   ├── session.test.ts       ✅
    │   │   └── store.svelte.ts       ✅ gör sessionen reaktiv för vyerna (Svelte-runes)
    │   ├── assessment.ts             ✅ bedömning per kontroll, SoA, filter och "behöver uppmärksamhet"
    │   ├── assessment.test.ts        ✅
    │   ├── compliance.ts             ✅ förlopp och uppfyllnad per avsnitt och tema
    │   ├── compliance.test.ts        ✅
    │   ├── actions.ts                ✅ åtgärdsförslag, åtgärder, riskbehandlingsplan (B-34)
    │   ├── actions.test.ts           ✅
    │   ├── dashboard.ts              ✅ redo för revision (B-37)
    │   ├── dashboard.test.ts         ✅
    │   ├── compare.ts                ✅ jämförelse mellan två bedömningar (B-38)
    │   ├── compare.test.ts           ✅
    │   ├── report/                   ✅ rapporternas CSS, Word-fil och CSV-export (B-39)
    │   ├── ui/runner.svelte.ts       ✅ kör en åtgärd från ett klick och samlar meddelanden
    │   ├── ui/format.ts              ✅ datum som text, till exempel i går 16:40
    │   ├── ui/dialog.svelte.ts       ✅ bekräftelsedialog i stället för confirm()
    │   ├── ui/logo.jpg               ✅ Method-logotypen (sidhuvud och rapporter, B-42)
    │   ├── ui/nav.svelte.ts          ✅ aktiv flik och genvägar mellan flikar (B-35)
    │   ├── ui/print.svelte.ts        ✅ utskrift och Word-export (B-39)
    │   ├── ui/comparison.svelte.ts   ✅ den tidigare bedömningen som jämförs (B-38)
    │   ├── zod-setup.ts              ✅ zod utan kodgenerering (krävs av CSP)
    │   ├── evidence/                 ✅ bifogad evidens (B-31)
    │   │   ├── evidence.ts           ✅ referenser, sökvägar, "saknar evidens"
    │   │   └── evidence.test.ts      ✅
    │   ├── cloud/                    ✅ grunden för automatisk granskning (B-18)
    │   │   ├── findings.ts           ✅ filformatet för fynd (B-33)
    │   │   └── findings.test.ts      ✅
    │   ├── risk/                     riskmetod, riskvärden, nivåer, restrisk
    │   │   ├── typrisker-iso27001.yaml ✅ 15 typrisker med föreslagna kontroller
    │   │   ├── templates.ts          ✅ schema för typrisker och import till ett projekt
    │   │   ├── rules.ts              ✅ riskmetod, riskvärden, nivåer, restrisk och nyckeltal (B-27)
    │   │   └── operations.ts         ✅ ändringar i risker och riskmetod
    │   ├── storage/                  ✅ var projektfilen sparas
    │   │   ├── target.ts             ✅ gränssnittet SaveTarget och filnamn
    │   │   ├── folder.ts             ✅ vald mapp via File System Access API (Chrome, Edge)
    │   │   ├── download.ts           ✅ reservläge: nedladdning (Safari, Firefox)
    │   │   ├── backup.ts             ✅ reservkopia i localStorage mellan sparningarna
    │   │   ├── backup.test.ts        ✅
    │   │   ├── memory-storage.ts     ✅ localStorage i minnet, för testerna
    │   │   ├── recent.ts             ✅ Senaste arbeten i IndexedDB, med mapphandtag
    │   │   ├── recent.test.ts        ✅
    │   │   ├── workflow.ts           ✅ flödena välj mapp → behörighet → läs fil
    │   │   ├── workflow.test.ts      ✅
    │   │   ├── evidence-files.ts     ✅ evidensfiler i mappen: kopiera, läsa, kontrollsumma
    │   │   ├── evidence-files.test.ts ✅
    │   │   ├── settings.ts           ✅ konsultens namn i webbläsaren (B-32)
    │   │   └── target.test.ts        ✅
    ├── views/                        en komponent per flik (se avsnitt 4)
    │   ├── StartPage.svelte          ✅ startsidan (4.1)
    │   ├── ProjectPage.svelte        ✅ det öppna projektet med flikar
    │   ├── Overview.svelte           ✅ översikt (4.3)
    │   ├── RiskMethodView.svelte     ✅ riskmetod (4.4)
    │   ├── RiskRegisterView.svelte   ✅ riskregister (4.5)
    │   ├── RiskDetail.svelte         ✅ riskdetalj (4.6)
    │   ├── ControlsView.svelte       ✅ grundkrav och Annex A (4.7)
    │   ├── SoaView.svelte            ✅ SoA (4.8)
    │   ├── ActionPlanView.svelte     ✅ åtgärdsplan (4.9)
    │   ├── ReportsView.svelte        ✅ rapporter (4.10)
    │   └── FollowUpView.svelte       ✅ uppföljning (4.12)
    └── components/                   återanvändbara delar: statusväljare, filter, matris …
        ├── Notice.svelte             ✅ meddelanden och fel
        ├── StatusBar.svelte          ✅ stapel för uppfylld, delvis och ej uppfylld
        ├── StatusPicker.svelte       ✅ val av status
        ├── StatusBadge.svelte        ✅ status som bricka
        ├── ControlItem.svelte        ✅ en kontroll med bedömning
        ├── EvidenceList.svelte       ✅ bifogade filer: lista, öppna, bifoga, ta bort
        ├── ActionItem.svelte         ✅ en åtgärd med alla fält
        ├── LinkedActions.svelte      ✅ åtgärder vid en kontroll eller risk
        ├── HelpDialog.svelte         ✅ instruktion för konsulter
        ├── MenuButton.svelte         ✅ knapp med en lista med val ("Lägg till i …", konsekvenstyp)
        ├── reports/                  ✅ rapporterna och PrintHost som skriver ut dem
        ├── DialogHost.svelte         ✅ visar bekräftelsedialogen
        ├── Modal.svelte              ✅ modal ruta
        ├── RiskMatrix.svelte         ✅ riskmatris 5 × 5
        ├── LevelBadge.svelte         ✅ riskvärde med nivåfärg
        ├── LinkControlDialog.svelte  ✅ koppla kontroll till risk
        └── ImportTemplatesDialog.svelte ✅ importera typrisker
```

**Tumregel för var koden hör hemma:**

- **`lib/`:** ren TypeScript utan Svelte, så att logiken kan testas utan UI.
- **`views/` och `components/`:** bara presentation. De läser från och skriver till `store`.

## 3. Hur verktyget är uppbyggt

Verktyget bygger på tre lager:

```
 Ramverk (YAML, skrivskyddat)   +   Projektfil (.grc.json, kundens data)
            │                                  │
            └──────────────┬───────────────────┘
                           ▼
                 store.svelte.ts  (state i minnet)
                           │
          ┌────────────────┼──────────────────┐
          ▼                ▼                  ▼
     Vyer (flikar)   Beräkningar (lib/)   Lagring (autospara)
```

1. **Ramverket** beskriver *vad som ska bedömas*. Det byggs in i verktyget och ändras aldrig av användaren.
2. **Projektfilen** beskriver *kundens svar*: status, motiveringar, risker och åtgärder. Den pekar på kontroller via deras ID, till exempel `"A.8.20"`.
3. **Store** laddar projektfilen, validerar den och exponerar den som reaktiv state.
   - Alla ändringar går via store, som markerar filen som osparad och startar autosparningen.
   - Allt som kan räknas fram räknas fram med `$derived` och sparas aldrig i filen. Det gäller uppfyllnadsgrad, riskvärden, faktisk restrisk och listor som "behöver uppmärksamhet".

### Principer

- **Validera vid gränserna.** Allt som läses in, alltså ramverk, projektfiler och gamla exporter, går genom zod innan det används. En ogiltig fil ger ett begripligt felmeddelande, aldrig ett halvt laddat projekt.
- **Fungera helt utan nät.** Verktyget ska byggas till en enda HTML-fil där allt är inbäddat.
- **Aldrig tyst dataförlust.** Om verktyget inte kan spara ska det synas tydligt, och stängning av fliken ska varnas för när det finns osparade ändringar.
- **Svenska i gränssnittet, engelska i koden.** Fältnamn och variabler skrivs på engelska, alla texter i UI på svenska.

## 4. Funktioner

Funktionerna nedan är det verktyget erbjuder i dagsläget. (skärm 1–5 och 7).

### 4.1 Startsida


- **Nytt arbete** (huvudkortet till vänster)
  - **Kund:** fritext.
  - **Ramverk:** ett per arbete. Kort visas för ISO 27001:2022, NIS2, CIS Controls v8 och DORA, med omfattning och en mening om ramverket. Bara ramverk som finns i `lib/frameworks/` går att välja, övriga visas som "Kommer".
  - **Startpunkt för riskregistret:**
    - *Med typrisker:* typriskerna i `lib/risk/` läggs in i projektfilen direkt (i dag 15 risker).
    - *Tomt register.*
    - *Kopiera från kund:* återanvänder riskmetod och struktur från ett tidigare uppdrag med samma ramverk, men inte bedömningarna.
  - **Sparplats:** efter valen väljer användaren uppdragets mapp, och projektfilen sparas där med kundens namn (ARCHITECTURE B-22).
- **Öppna befintligt arbete** (till höger): dra in uppdragets mapp eller projektfilen, eller välj mapp. I Safari och Firefox väljs eller dras filen. En indragen fil öppnas utan mapp, och Spara ber då om mappen. Exportfiler från det gamla verktyget avvisas med ett tydligt meddelande (ARCHITECTURE B-16).
- **Senaste arbeten** (till höger): kund, ramverk, när projektet ändrades, andel bedömda i procent och en stapel för uppfylld, delvis och ej uppfylld, med "Fortsätt". Fyra visas, "Visa alla" visar resten. "Ta bort ur listan" påverkar inte filen. Listan sparas i webbläsaren (ARCHITECTURE B-26). Projekt som laddats ned har "Välj fil" i stället för "Fortsätt".
- **Osparade ändringar i webbläsaren** visas överst när det finns reservkopior (ARCHITECTURE B-25).

### 4.2 Sidhuvud (alla vyer)

- Method-logotypen, verktygets namn, kundnamn och ramverk.
- **Sparstatus:** "Autosparat till nordvik.grc.json · 14:42" eller "Osparade ändringar sedan 14:32" (i varningsfärg).
- Knapparna **Spara**, **Spara som** och **Stäng**.
- **Flikar:** Översikt · Riskmetod · Riskregister · Grundläggande krav · Annex A · SoA · Åtgärdsplan · Uppföljning · Rapporter. Flikarna har räknare, till exempel antal risker, krav, kontroller och öppna eller försenade åtgärder. Avsnittens flikar kommer från ramverket.
- **Sidfoten** har version och länken **Instruktion**: arbetsgång, sparande i SharePoint och vad som gäller när två personer arbetar i samma fil.

### 4.3 Översikt (dashboard)

Översikten är dashboarden för konsulten och kundens ledning (fas 6, ARCHITECTURE B-37).

- **Redo för revision:** en procentsats och ett omdöme (Redo, Nära, Inte redo), byggt av upp till sju delar som var och en visar *x av y*:
  - alla krav och kontroller bedömda
  - grundkrav uppfyllda
  - tillämpliga kontroller uppfyllda
  - evidens för uppfyllda
  - bortval i SoA motiverade
  - risker behandlade och godkända
  - brister med planerad åtgärd (ansvarig och deadline)

  Helheten är medelvärdet av delarna som gäller. *Redo* kräver minst 90 % och att alla grundkrav är uppfyllda. Varje del länkar till det som återstår.
- **Uppfyllnadsgrad:** `uppfyllda / tillämpliga`, där bortvalda kontroller i SoA inte räknas. Visas totalt med fördelning per status, per avsnitt och per tema.
- **Åtgärder:** öppna, försenade, klara och brister utan åtgärd.
- **Riskprofil:** matrisen före behandling och med faktisk restrisk, och risknyckeltalen.
- **Behöver uppmärksamhet:** ej bedömda, saknar ansvarig och saknar evidens per avsnitt, och SoA-bortval utan motivering. Bifogade filer kan kontrolleras.
- **Projekt:** kundnamn, ditt namn (sparas i webbläsaren), omfattning, deltagare och sammanfattning till rapporterna (ARCHITECTURE B-40).
- **Skriv ut lägesbild:** dashboarden på en sida.

### 4.4 Riskmetod (steg 1 i riskarbetet)

Riskmetoden är underlag för krav 6.1.2 och 8.2 och skrivs ut som bilaga i rapporten.

- **Konsekvensskala 1–5**
  - Nivåerna heter Försumbar, Begränsad, Måttlig, Allvarlig och Kritisk.
  - Det finns en kolumn per konsekvenstyp. Standard är "Verksamhet och ekonomi" samt "Information och anseende".
  - Knappen "+ Lägg till konsekvenstyp" öppnar en lista: Människa och Hälsa, Miljö, Förtroende och Varumärke, Lagar och Regler (Compliance), eller en egen typ. Typer som redan finns går inte att välja igen.
  - Alla texter går att redigera genom att klicka i en ruta. Knappen "Återställ standard" finns.
- **Sannolikhetsskala 1–5**
  - Nivåerna heter Mycket osannolik, Osannolik, Möjlig, Sannolik och Mycket sannolik.
  - Varje nivå har en frekvens och en tolkning, och alla texter går att redigera.
- **Riskmatris 5×5:** riskvärde = konsekvens × sannolikhet. Nivåerna är:

  | Nivå | Riskvärde |
  |---|---|
  | Låg | 1–3 |
  | Medel | 4–6 |
  | Hög | 8–12 |
  | Mycket hög | 15–25 |

- **Acceptanskriterium:** risker med värde upp till gränsen (standard 6) är acceptabla. Risker över gränsen kräver behandlingsbeslut och ägare.
- **Intervall för ny bedömning:** standard är var 12:e månad och vid väsentlig förändring. "Nästa bedömning" räknas fram.
- **Fastställd av:** namn, roll och datum. Knappen **Klar** kräver ett namn, sätter dagens datum om det saknas och visar acceptansnivå, intervall och fastställande som text. "Ändra" öppnar fälten igen.

### 4.5 Riskregister (steg 2 i riskarbetet)

Riskregistret är underlag för krav 6.1.1, 6.1.3 och 8.2.

- **Nyckeltal:**
  - antal risker
  - över acceptansnivå
  - restrisk ej uppnådd
  - väntar på godkännande
- **Värmekarta** med antal risker per ruta i matrisen, med växling mellan *före* och *efter* behandling.
- **Tabell** med kolumnerna:
  - ID (`R-001` …)
  - risk och tillgång
  - ägare
  - K, S och värde (färg efter nivå)
  - behandling: Reducera, Dela, Acceptera, Undvik eller *Ej beslutad*
  - kopplade kontroller
  - restrisk
  - godkänd
- **Sök och filter:** fritext, nivå, ägare och behandling.
- **Koppla kontroller:** en dialog med sökning bland Annex A-kontrollerna. Föreslagna kontroller markeras.
  - Kopplade kontroller **låses som tillämpliga i SoA**.
  - Om en kontroll som är bortvald i SoA kopplas, tas den tillbaka automatiskt och användaren får en tydlig notis om det.
- **Varning** när faktisk restrisk är högre än planerad, till exempel "▲ Faktisk 12 — A.8.20 delvis".
- **Ny risk** och **Importera typrisker**. Typrisker som inte gäller tas bort i riskdetaljen och kan importeras igen (ARCHITECTURE B-30).
- **Markering av saknade uppgifter:** risker som saknar ägare eller behandlingsbeslut markeras.

### 4.6 Riskdetalj

- **Riskinformation:**
  - beskrivning, hot och sårbarhet
  - berörda tillgångar eller processer
  - riskägare
  - behandlingsval och plan
  - datum: identifierad, senast bedömd och nästa bedömning
- **Bedömning i tre steg**, visade som tre markeringar i samma matris:

  | Steg | Hur värdet tas fram |
  |---|---|
  | Före behandling | Anges för hand (K × S) |
  | Planerad restrisk | Räknas fram från kopplade kontroller, som om alla vore uppfyllda |
  | Faktisk restrisk | Räknas fram från kopplade kontroller och deras status |
  | *Accepterad risk* | *Restrisken är risken före behandling* |

  Varje kopplad kontroll har effektivitet (Låg 0,25, Medel 0,5, Hög 0,75) och sänker antingen sannolikheten (förebyggande) eller konsekvensen (begränsande). Regeln står i ARCHITECTURE B-27.

- **Kopplade kontroller:** ref, namn, status och SoA-läge ("Låst tillämplig"). Knappen "+ Koppla kontroll".
- **Historik** över ändringar, till exempel ändrad status på kopplad kontroll, ny koppling eller risk skapad från typrisk.
- **Godkännande av restrisk:**
  - Om faktisk restrisk ligger över acceptansnivån kan riskägaren bara godkänna genom ett aktivt beslut att acceptera högre risk. Det beslutet kräver en motivering.
  - Godkännandet sparar namn och datum.
- **Evidens:** bifogade filer som underlag för bedömningen, på samma sätt som för kontroller (4.7).
- **Kopplad åtgärd** i åtgärdsplanen.
- **Navigering** till föregående och nästa risk.
- **Ta bort risken:** efter en bekräftelse. ID:t återanvänds inte, och kontroller som bara var kopplade till risken låses upp i SoA.

### 4.7 Grundkrav och Annex A

Grundkrav och Annex A använder samma vy, med en växlare mellan dem.

- **Sidomeny:**
  - uppfyllnadsgrad
  - teman eller kapitel med stapel per status
  - "Behöver uppmärksamhet": ej bedömda, saknar evidens och saknar ansvarig
- **Verktygsrad:**
  - sök i kontroll, kommentar och filnamn
  - filtrera på status
  - "Dölj ej tillämpliga"
  - "Visa alla detaljer" och "Dölj detaljer"
- **Rad per kontroll:** ID, namn, antal bilagor, kopplade risker och status.
- **Öppnad kontroll:**
  - **Status:** Uppfylld, Delvis uppfylld, Ej uppfylld eller Ej bedömd.
  - **Motivering och observation:** fritext. Knappen "Föreslå text från risker" hämtar text från kopplade risker.
  - **Ansvarig** och **kopplade risker** (med riskvärde).
  - **Bevisbörda:** texten `guidance` från ramverket, skrivskyddad.
  - **Bifogad evidens:** dra in filer eller klicka på "Bifoga fil". Filerna kopieras till `evidens/<kontroll-ID>/` bredvid projektfilen i kundens mapp, och samma fil kopieras aldrig två gånger. Projektfilen innehåller bara sökväg, storlek, kontrollsumma, källa (manuell eller automatisk), vem som lade till filen och när. Saknas filen, eller har den ändrats, visas en varning. Filen öppnas i en ny flik. "Ta bort" tar bara bort referensen; filen ligger kvar i mappen. Kräver Chrome eller Edge med mappåtkomst, och högst 100 MB per fil (ARCHITECTURE B-31).
  - **Evidens på annan plats:** fritext för evidens som inte bifogas, till exempel en sökväg i kundens intranät.
  - **Teknisk och organisatorisk del (valfritt):** statusen kan delas upp i två delar som underlag. Den övergripande statusen sätts alltid av konsulten (ARCHITECTURE B-18). "Ta bort uppdelningen" tar bort delarna igen.
  - **Sidfot:** "Senast uppdaterad … av …".
- **Åtgärder:** kopplade åtgärder visas vid kontrollen. En brist utan åtgärd har knappen "Skapa åtgärd" (ARCHITECTURE B-34).
- **Bortvalda kontroller** i Annex A visas utgråade och kan inte bedömas.
- **Grundkrav kan aldrig väljas bort.**
- **Saknar evidens:** en tillämplig kontroll som är Uppfylld eller Delvis uppfylld utan bifogad fil och utan text i *Evidens på annan plats*.

### 4.8 SoA (Statement of Applicability)

- **Lista** över alla Annex A-kontroller med kryssruta för *tillämplig*.
- **Bortvalda kontroller** kräver en motivering. Tillämpliga kontroller kan också få en motivering.
- **Låsta kontroller:** kontroller som är kopplade till risker är låsta som tillämpliga och visar vilka risker det gäller.
- **Filter:** alla, tillämpliga, bortvalda, och bortvalda utan motivering (det som stoppar en godkänd SoA).
- **Sammanfattning:** antal tillämpliga, antal bortvalda och antal saknade motiveringar.
- **Export:** SoA kan exporteras separat för utskrift (krav 6.1.3 d).

### 4.9 Åtgärdsplan

Åtgärder föreslås och godkänns av konsulten (ARCHITECTURE B-34).

- **Förslag:** varje brist utan åtgärd ger ett förslag. Risker vars faktiska restrisk är över acceptansnivån (och inte accepteras) föreslås med hög prioritet och tar med sina bristande kontroller. Kontroller som är Ej uppfyllda får hög prioritet, Delvis uppfyllda medel. Förslag sparas inte i filen.
- **Godkänna:** "Skapa åtgärd" ger en åtgärd med eget ID (ATG-001). Med "Lägg till i …" läggs förslaget till en befintlig öppen åtgärd, så att en åtgärd täcker flera brister.
- **Fält per åtgärd:** rubrik, beskrivning, ansvarig, deadline, prioritet (valfri), status (Ej påbörjad grå, Pågår blå, Klar grön, Avbruten röd), kopplade kontroller och risker, källa och datum.
- **Inget tas bort.** En åtgärd som inte behövs sätts till Avbruten, så att historiken finns kvar till uppföljningen.
- **Varningar:** försenad, saknar ansvarig eller deadline, "underlaget är åtgärdat, stäng?" och "klar men bristen finns kvar". Status ändras aldrig automatiskt.
- **Filter och sortering:** sök, status, ansvarig och bara försenade. Sorteras på prioritet, deadline och ID.
- **Riskbehandlingsplan** (krav 6.1.3 e–f) kan skrivas ut direkt från fliken.
- **Länkar** till kontrollen eller risken, och från dem tillbaka till åtgärdsplanen.

### 4.10 Rapporter

Rapporterna förhandsvisas i fliken Rapporter och har samma sidhuvud: Method-logotypen, rubrik, kund, ramverk, datum, konsult och version (ARCHITECTURE B-39).

| Rapport | Innehåll |
|---|---|
| Komplett rapport | Om bedömningen, lägesbild, progress (om en jämförelse finns), gapanalys, SoA och riskbehandlingsplan med riskmetoden som bilaga |
| Lägesbild | Dashboarden på en sida |
| Gapanalys | Om bedömningen, brister med åtgärder, och alla krav och kontroller med status, observation, evidens och ansvarig |
| SoA | Tillämplighet, motivering och genomförande per kontroll (krav 6.1.3 d) |
| Riskbehandlingsplan | Risker med behandling, restrisk, åtgärder och godkännande, med riskmetoden som bilaga |
| Progressrapport | Ändringar sedan förra bedömningen (4.12) |

- **PDF:** "Skriv ut eller spara som PDF" använder webbläsarens utskrift. Bara rapporten skrivs ut.
- **Word:** "Ladda ned för Word" ger en .doc-fil som Word öppnar och kan redigera.
- **Excel:** krav och kontroller, risker och åtgärder kan exporteras som CSV som svenska Excel öppnar direkt.

### 4.11 Spara och öppna

- **"Spara" och "Spara som"** skriver direkt till projektfilen i uppdragets mapp, till exempel kundens synkade SharePoint-mapp (Chrome och Edge). I Safari och Firefox laddas filen ned i stället (ARCHITECTURE O-01, B-22).
- **Autosparning** var tionde minut, men bara när något har ändrats och bara till en mapp, aldrig som nedladdning.
- **Sparstatus** visas tydligt: sparat till fil, osparade ändringar, sparar, nedladdad eller fel (ARCHITECTURE B-23).
- **Ogiltigt projekt i minnet** skrivs aldrig till fil. Felen visas med sökväg i stället.
- **Reservkopia i webbläsaren.** Varje ändring sparas också i localStorage och rensas när filen är säkert sparad. Öppnas en fil som är äldre än kopian erbjuds de nyare ändringarna. Kopior som finns kvar visas på startsidan (ARCHITECTURE B-25).
- **Osparade ändringar** ger en varning vid stängning.
- **Ogiltig projektfil** ger ett tydligt fel om vad som är fel. Filen skrivs aldrig över.

### 4.12 Uppföljning

Jämförelse mellan två bedömningar av samma kund (fas 7, ARCHITECTURE B-38).

- **Starta nästa bedömning:** skapar en ny projektfil med dagens datum i namnet, med allt från den öppna bedömningen. Allt behåller sina ID:n. Godkännanden av restrisk tas bort. Den gamla filen ändras inte, och den blir direkt jämförelsen.
- **Jämför med en tidigare fil:** välj projektfilen från förra bedömningen. Filen läses bara in i minnet.
- **Sammanfattning** i en mening, till exempel "Uppfyllnaden har ökat från 58 % till 71 %. 14 kontroller har förbättrats och 2 har försämrats.", och uppfyllnad per avsnitt före och nu.
- **Kontroller:** förbättrade, försämrade, nybedömda och inte längre bedömda, som en lista som går att filtrera.
- **Även:** SoA-ändringar, nya, borttagna och ändrade risker, avslutade, nya och försenade åtgärder, och ny evidens.
- **Varningar** om filerna gäller olika kunder eller om ordningen verkar fel. Olika ramverk kan inte jämföras.
- **Progressrapport** kan skrivas ut.

## 5. Projektfilens format

Schemat finns i [`src/lib/project/schema.ts`](src/lib/project/schema.ts), och en komplett påhittad exempelfil finns i [`tests/fixtures/exempel.grc.json`](tests/fixtures/exempel.grc.json). Skälen bakom formatet står i ARCHITECTURE B-17.

```jsonc
{
  "schemaVersion": 1,
  "tool": "method-grc",
  "id": "0f8c2b7e-…",                  // unikt för bedömningen
  "previousId": "…",                   // valfritt: bedömningen den utgår från (fas 7)
  "client": { "name": "Exempelbolaget AB" },
  "framework": { "id": "iso27001", "version": "2022" },
  "createdAt": "2026-09-02T09:00:00Z",
  "updatedAt": "2026-09-22T14:42:00Z",

  "riskMethod": { … },                 // skalor, acceptansnivå, intervall, fastställd av

  "risks": [{
    "id": "R-001",
    "title": "Obehörig åtkomst via öppen fjärrskrivbordsport",
    "owner": "Bertil Berg, IT-chef",
    "before":  { "consequence": 4, "likelihood": 4 },
    "treatment": "reduce",
    "controls": [{ "control": "A.8.20", "effect": "high", "type": "preventive" }],
    "evidence": [],
    "identifiedAt": "2026-09-02",
    "approval": null,
    "history": [{ "at": "2026-09-09T10:00:00Z", "by": "Konsult K.", "text": "A.5.15 kopplad" }]
  }],

  "controls": {
    "A.8.20": {
      "status": "partial",
      "parts": { "technical": "not_fulfilled", "organizational": "fulfilled" },
      "comment": "…", "owner": "…", "evidenceNote": "",
      "applicable": true, "soaJustification": "",
      "evidence": [{ "id": "EV-001", "file": "evidens/A.8.20/Natverkspolicy_v2.1.pdf", "size": 348160,
                     "sha256": "…", "source": "manual",
                     "addedBy": "Cecilia Carlsson", "addedAt": "2026-09-18T11:20:00Z" }],
      "updated": { "at": "2026-09-22T14:40:00Z", "by": "Konsult K." }
    }
  },

  "actions": [{
    "id": "ATG-001", "title": "Stäng port 3389 och inför säker fjärråtkomst",
    "owner": "Bertil Berg", "due": "2026-10-15", "status": "in_progress",
    "source": { "type": "control", "id": "A.8.20" },
    "controls": ["A.8.20"], "risks": ["R-001"], "createdAt": "2026-09-22"
  }],

  "nextNumber": { "risk": 4, "action": 2, "evidence": 2 }
}
```

**Regler för formatet:**

- **Tillåtna värden:**
  - status: `not_assessed`, `fulfilled`, `partial` eller `not_fulfilled`
  - behandling: `undecided`, `reduce`, `share`, `accept` eller `avoid`
  - åtgärdsstatus: `not_started`, `in_progress`, `done` eller `cancelled`
  - åtgärdens prioritet (valfri): `high`, `medium` eller `low`
  - evidensens källa: `manual` eller `automatic`
- **Fasta ID:n.** Risker (`R-001`), åtgärder (`ATG-001`) och evidens (`EV-001`) får löpnummer från `nextNumber`. Ett ID återanvänds aldrig, inte ens när posten tas bort.
- **Beräknade värden sparas aldrig.** Det gäller riskvärde, nivå, faktisk restrisk, uppfyllnadsgrad, åtgärdsförslag och redo för revision.
- **`engagement`** (valfritt) har uppdragets omfattning, deltagare och sammanfattning. **`previousId`** pekar på bedömningen som en uppföljning startades från.
- **Kontroller som inte finns i `controls`** tolkas som `not_assessed`, alltså tillämpliga men ännu inte bedömda.
- **Fält som saknas** fylls i med standardvärden vid inläsning, så filen behöver inte innehålla tomma fält.
- **Kopplingar mot ramverket** (okända kontroll-ID:n, bortvald kontroll som är kopplad till en risk) kontrolleras med `checkAgainstFramework()` i `project.ts`.

### Fynd från automatisk granskning

Ett framtida granskningsprogram, till exempel CloudSecComp mot Azure, skriver sina fynd till en fil i uppdragets mapp. Verktyget läser filen; det har ingen nätverksåtkomst. Schemat finns i `src/lib/cloud/findings.ts` (ARCHITECTURE B-33). Inläsningen i gränssnittet byggs när programmet finns.

```jsonc
{
  "format": "grc-fynd",
  "version": 1,
  "source": { "tool": "CloudSecComp", "toolVersion": "0.1.0", "environment": "Azure-tenant contoso.onmicrosoft.com" },
  "collectedAt": "2026-10-12T08:00:00Z",
  "findings": [{
    "control": "A.8.5",                 // kontroll-ID i ramverket
    "status": "partial",                // fulfilled, partial eller not_fulfilled
    "title": "MFA saknas för 3 administratörer",
    "detail": "…",
    "resource": "/subscriptions/…",     // resurs i molnmiljön
    "evidence": [{ "file": "evidens/mfa-rapport.json", "sha256": "…" }]
  }]
}
```

- **Fynden gäller bara den tekniska delen** (`parts.technical`). Den övergripande statusen sätts alltid av konsulten (B-18).
- **Flera fynd för samma kontroll** ger den sämsta statusen.
- **Filer från granskningen** får källan `automatic` när de bifogas.
- **Ändras formatet** höjs `version`, och äldre versioner ska fortsätta gå att läsa.

## 6. Lägga till ett nytt ramverk

1. **Skapa filen** `src/lib/frameworks/<id>-<version>.yaml` enligt schemat i `schema.ts`. Använd `iso27001-2022.yaml` som mall.
   - Alla ID:n ska vara fullständiga textsträngar.
   - Sätt `soa: true` bara på avsnitt som ska ingå i en SoA.
2. **Registrera ramverket** i `src/lib/frameworks/index.ts`: importera YAML-filen, lägg den i `available` och ta bort posten ur `upcoming` om den fanns där.
3. **Skriv ett test** `<id>.test.ts` som låser antalet kontroller per grupp, på samma sätt som `iso27001.test.ts`.
4. **Kör kontrollerna:** `npm test` och `npm run check`.
5. **Dokumentera ändringar** i ARCHITECTURE.md om ramverket kräver ändringar i schemat. Nya fält är alltid valfria.

