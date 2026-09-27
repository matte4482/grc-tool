# TODO

Småfix och konkreta punkter som ska åtgärdas. Claude läser den här filen innan något större byggs.

- Bocka av med `[x]` och datum när en punkt är klar. Ta bort avbockade punkter när en fas är avslutad.
- Ange fil och rad när det går, och i vilken fas punkten senast måste vara åtgärdad.
- Större beslut hör hemma i ARCHITECTURE.md, inte här.

*Senast uppdaterad: 27 september 2026*

## Före fas 1 (filsparande)

- [ ] **Bestäm mappåtkomst eller filåtkomst.** Ska konsulten välja uppdragets *mapp* (`showDirectoryPicker`) eller bara *projektfilen* (`showSaveFilePicker`)? Mappen behövs för evidens i fas 4, så valet påverkar hur sparandet byggs. Skriv in beslutet i ARCHITECTURE.
- [ ] **Verifiera File System Access API från `file://`.** Kontrollera att `showSaveFilePicker` och `showDirectoryPicker` fungerar när `dist/index.html` öppnas från disk i Chrome och Edge, på både Mac och Windows, innan sparandet byggs.
- [ ] **`takeId` ändrar projektet direkt** (`src/lib/project/project.ts:76–81`). När store byggs måste alla ändringar gå via store, annars uppdateras inte sparstatus och autosparning. Låt store anropa `takeId` och markera projektet som osparat.
- [ ] **`serializeProject` kastar fel vid ogiltigt projekt** (`src/lib/project/project.ts:63–65`). Store måste fånga felet och visa det tydligt, och aldrig skriva en halv fil.

## Före fas 2 (startsida och vyer)

- [ ] **Avsnittsnamn är hårdkodade för ISO 27001** (`src/App.svelte:26–27`: `'clauses'`, `'annex-a'`). Gå igenom `framework.sections` och använd `section.unit` och `section.title`, så att NIS2 och andra ramverk fungerar utan kodändring.

## Före fas 3 (risk)

- [ ] **Ö-03 måste avgöras:** regeln för faktisk restrisk (alternativ A eller B). Se ARCHITECTURE.

## Före fas 4 (evidens)

- [ ] **Dubblerade evidens-ID:n rapporteras med fel sökväg** (`src/lib/project/schema.ts`, `unique(evidenceIds, 'evidens', 'controls')` i `ProjectSchema.superRefine`). Felet pekar alltid på `controls`, även när dubbletten sitter på en risk. Rapportera den faktiska platsen, till exempel `risks.0.evidence.0.id`, och lägg till ett test.

## Småfix, när som helst

- [ ] **Externt skript rapporteras två gånger** (`scripts/finalize-build.mjs:36–37`). Samma `<script src>` hittas både av skriptsökningen och attributsökningen. Ta bort dubbletten och uppdatera testet i `scripts/finalize-build.test.mjs`.
- [ ] **Felmeddelande på engelska** (`src/lib/frameworks/schema.ts`, `Duplication of ID`). Principen är svenska i allt användaren kan se (README, Principer). Meddelandet syns bara om en ramverksfil är trasig, men bör vara `Dubblett-ID: …` för att följa principen.
- [ ] **Kommentaren "Risknivå 1-5" är missvisande** (`src/lib/project/schema.ts`, ovanför `LevelSchema`). Den gäller nivån på konsekvens- och sannolikhetsskalan. Risknivån (riskvärdet) är 1–25.

## Beslut från Plan 2.0 som fortfarande behövs

- [ ] Vem skriver typriskerna och granskar bevisbördetexterna? En senior ISO-konsult, uppskattningsvis 3–4 dagar. Behövs före fas 3.
- [ ] Vilken kund kan vara testkund i fas 8?
- [ ] Hur mycket tid per vecka läggs på utvecklingen?
