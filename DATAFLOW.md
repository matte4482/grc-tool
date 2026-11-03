# Beroenden och dataflöde

Kartan över hur koden hänger ihop: vilka moduler som beror på vilka, och hur data går från ett klick till projektfilen och rapporterna. Besluten bakom står i [ARCHITECTURE.md](ARCHITECTURE.md), funktionerna i [README.md](README.md).

*Senast uppdaterad: 14 oktober 2026*

## Lager

```mermaid
flowchart TD
  V[views/ och components/<br/>visar och skickar ändringar] -->|läser| ST[project/store.svelte.ts<br/>reaktivt tillstånd]
  V -->|store.update(ändring)| ST
  V -->|räknar med| L[lib/ ren TypeScript<br/>assessment, compliance, risk, actions,<br/>dashboard, compare, evidence, report]
  ST --> SE[project/session.ts<br/>projekt, sparstatus, autosparning]
  SE --> P[project/project.ts + schema.ts<br/>validering, läsa och skriva]
  SE --> T[storage/target.ts<br/>mapp eller nedladdning]
  SE --> B[storage/backup.ts<br/>reservkopia i localStorage]
  L --> P
  L --> F[frameworks/<br/>ramverk som data]
  T --> D[(Kundens mapp:<br/>projektfil.grc.json + evidens/)]
```

Tre regler håller ordningen:

1. **`lib/` innehåller ingen Svelte**, utom de små tillståndsmodulerna `*.svelte.ts`. Logiken testas därför utan webbläsare.
2. **Vyerna ändrar aldrig projektet direkt.** De anropar `store.update(draft => …)` med en ändringsfunktion ur `lib/`, till exempel `setStatus` eller `acceptSuggestion`.
3. **Beräknade värden sparas aldrig.** Uppfyllnadsgrad, restrisk, åtgärdsförslag, redo för revision och jämförelser räknas fram varje gång ur projektfilen.

## Moduler i lib/

| Modul | Ansvar | Beror på |
|---|---|---|
| `frameworks/schema.ts` | Schema för ramverk, `allControls`, `controlTitles` | – |
| `frameworks/index.ts` | Register över ramverk | `schema` |
| `project/schema.ts` | Schema för projektfilen | – |
| `project/project.ts` | Skapa, läsa, validera, skriva, `nextId`, `followUp` | `project/schema`, `frameworks/schema` |
| `project/session.ts` | Det öppna projektet, sparstatus, autosparning, reservkopia | `project`, `frameworks`, `storage/backup`, `storage/target` |
| `project/store.svelte.ts` | Gör sessionen reaktiv, Senaste arbeten | `session`, `storage/recent`, `storage/backup` |
| `scope.ts` | Vilka kontroller som bedöms: bortval i SoA, ej tillämpliga, målnivå (B-47) | `frameworks/schema`, `project/schema` |
| `assessment.ts` | Status, text, tillämplighet, filter, "behöver uppmärksamhet" | `project`, `evidence`, `scope`, `storage/settings` |
| `compliance.ts` | Förlopp och uppfyllnad per avsnitt och grupp | `project/schema`, `frameworks/schema`, `scope` |
| `risk/rules.ts` | Riskmetod, riskvärde, restrisk (B-27), nyckeltal | `project/schema` |
| `risk/operations.ts` | Ändringar i risker och riskmetod | `rules`, `project`, `storage/settings` |
| `risk/templates.ts` | Typrisker och import | `project`, `storage/settings` |
| `evidence/evidence.ts` | Evidensreferenser, "saknar evidens" | `project` |
| `actions.ts` | Åtgärdsförslag, åtgärder, varningar, riskbehandlingsplan | `assessment`, `risk/rules`, `project`, `frameworks/schema` |
| `dashboard.ts` | Redo för revision (B-37), uppfyllnad per nivå (B-47) | `actions`, `assessment`, `compliance`, `evidence`, `risk/rules`, `scope` |
| `compare.ts` | Jämförelse mellan två bedömningar (B-38) | `actions`, `assessment`, `compliance`, `evidence`, `risk/rules` |
| `report/csv.ts` | Export till Excel | `actions`, `assessment`, `risk` |
| `report/style.ts`, `report/word.ts` | Rapportens CSS och Word-filen | – |
| `cloud/findings.ts` | Filformat för fynd från automatisk granskning (B-33) | `frameworks/schema`, `project/schema` |
| `storage/target.ts` | Gränssnittet för sparmål, filnamn | – |
| `storage/folder.ts` | Mappåtkomst i Chrome och Edge | `target` |
| `storage/download.ts` | Nedladdning, `downloadFile` | `target` |
| `storage/workflow.ts` | Flödena välj mapp, dra in, öppna | `folder`, `download`, `recent` |
| `storage/backup.ts` | Reservkopia i localStorage | `project/schema` |
| `storage/recent.ts` | Senaste arbeten i IndexedDB | `compliance`, `target` |
| `storage/evidence-files.ts` | Evidensfiler i mappen, kontrollsumma | `evidence`, `folder` |
| `storage/settings.ts` | Konsultens namn i webbläsaren | `backup` (typen) |
| `ui/nav.svelte.ts` | Aktiv flik och genvägar mellan flikar | `store`, `frameworks/schema` |
| `ui/print.svelte.ts` | Utskrift och Word-export | `report/word`, `storage/download` |
| `ui/comparison.svelte.ts` | Den tidigare bedömningen som jämförs | `project/schema` |
| `ui/dialog.svelte.ts`, `ui/runner.svelte.ts`, `ui/format.ts` | Dialog, knappkörning med fel, datum som text | – |

Inga moduler beror på varandra i en ring, utom att `folder` och `workflow` delar en typ, vilket inte påverkar körningen.

## Dataflöden

### Skapa och öppna

```
StartPage ─ createProject() / parseProject() ─▶ store.start() / store.open()
          ─▶ session: kontroll mot ramverket, reservkopia, sparstatus ─▶ ProjectPage
```

- **Nytt arbete:** `createProject` → valfritt `addTemplateRisks` eller `copyFromProject` → `store.start(project, target)`, som sparar direkt.
- **Öppna:** `workflow.ts` läser filen ur mappen eller den indragna filen → `store.open(text, target)` → `parseProject` validerar → `checkAgainstFramework` ger varningar.
- **Fortsätt:** mapphandtaget i IndexedDB (`recent.ts`) → behörighet → samma väg som Öppna.

### Ändra

```
klick i vyn ─▶ store.update(d => setStatus(d, …)) ─▶ session.update():
  structuredClone → ändring → validering → nytt objekt i store → reservkopia → status "osparad"
```

Ändringsfunktionerna skriver också vem som ändrade (`updated.by`, `history.by`) med namnet ur `storage/settings.ts`.

### Spara

```
Spara / autosparning var 10:e minut ─▶ session.save() ─▶ serializeProject() ─▶ target.write()
  ─▶ mapp: skriver filen i kundens mapp │ nedladdning: laddar ned en kopia
  ─▶ reservkopian rensas, Senaste arbeten uppdateras
```

### Evidens

```
EvidenceList ─▶ prepareEvidence(): storlek → SHA-256 → samma fil finns? återanvänd : kopiera till evidens/<ID>/
             ─▶ store.update(addEvidence) ─▶ referensen sparas i projektfilen
```

Kontrollen av ändrade eller saknade filer läser filen och jämför kontrollsumman (`checkEvidence`).

### Beräkningar som vyerna visar

| Vad | Funktion | Visas i |
|---|---|---|
| Uppfyllnad | `compliance.sectionProgress`, `groupProgress` | Översikt, avsnitten, startsidan, rapporter |
| Behöver uppmärksamhet | `assessment.attention` | Avsnitten, Översikt |
| Restrisk | `risk/rules.residualRisk` | Riskregister, riskdetalj, Annex A, rapporter |
| Åtgärdsförslag | `actions.suggestions`, `suggestionFor` | Åtgärdsplan, kontroll, risk, Översikt |
| Redo för revision | `dashboard.readiness` | Översikt, lägesbild (ramverk med `readiness: true`) |
| Uppfyllnad per nivå | `dashboard.profileProgress` | Översikt, lägesbild (ramverk med `profiles`) |
| Tillämplighet | `scope.exclusion` | Alla beräkningar ovan, avsnitten, gapanalysen |
| Jämförelse | `compare.compareProjects`, `summaryText` | Uppföljning, progressrapport |

### Rapporter

```
Rapporter-fliken ─▶ ReportBody (förhandsvisning)
printer.print(id) ─▶ PrintHost ritar ReportBody i .print-sheet under body ─▶ window.print()
printer.word(id)  ─▶ samma HTML + REPORT_CSS ─▶ wordDocument() ─▶ downloadFile(.doc)
CSV               ─▶ controlRows / riskRows / actionRows ─▶ toCsv() ─▶ downloadFile(.csv)
```

### Uppföljning

```
Starta nästa bedömning ─▶ followUp(projekt) ─▶ store.start(ny fil med datum) ─▶ comparison.set(förra)
Välj tidigare fil      ─▶ parseProject() ─▶ comparison.set() ─▶ compareProjects() i vyn och rapporten
```

## Utbyggnad

- **Nytt ramverk:** en YAML-fil i `lib/frameworks/` och en rad i registret (README avsnitt 6). Logiken går igenom `framework.sections` och `allControls`, och avsnitt med `soa: true` får SoA. Avsnitts-ID:n får inte krocka med flikarna (`RESERVED_SECTION_IDS`). Med `riskManagement: false` döljs riskflikarna och planen blir en åtgärdsplan; med `profiles` får projektet en målnivå (B-47).
- **Import av fynd för CIS-ramverken:** kontroll-ID:t i CIS Azure-ramverken är CIS-ID:t, så fynd från t.ex. Prowler kan kopplas direkt via `cloud/findings.ts` (O-07).
- **Typrisker för ett nytt ramverk:** en YAML-fil i `lib/risk/` och en rad i `sets` i `templates.ts`.
- **Fynd från CloudSecComp:** `cloud/findings.ts` läser filen och ger status per kontroll. Inläsningen kopplas in som en knapp som sätter `parts.technical` med `setPart` och bifogar filer med `source: 'automatic'` via `addEvidence`.
- **Ny rapport:** en komponent i `components/reports/`, ett ID i `REPORT_TITLES` (`ui/print.svelte.ts`) och en rad i `ReportBody` och `ReportsView`.
- **Ny flik:** en vy i `views/`, ett ID i `tabs` i `ProjectPage.svelte` och i `RESERVED_SECTION_IDS`.
