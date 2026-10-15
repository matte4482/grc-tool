<script lang="ts">
  // Instruktion för konsulter: arbetsgång, sparande och arbete i samma fil.

  import Modal from './Modal.svelte'

  let { open, onclose }: { open: boolean; onclose: () => void } = $props()
</script>

<Modal {open} title="Instruktion" {onclose} wide>
  <div class="help">
    <h3>Arbetsgång</h3>
    <ol>
      <li>
        <strong>Skapa ett nytt arbete.</strong> Ange kundens namn och välj ramverk. Välj sedan uppdragets mapp, till exempel kundens
        SharePoint-mapp som är synkad till datorn via OneDrive. Projektfilen sparas i den mappen.
      </li>
      <li>
        <strong>Fastställ riskmetoden och bedöm riskerna.</strong> Gå igenom skalorna och acceptansnivån med kunden under Riskmetod. Ta
        bort de typrisker som inte gäller kunden och bedöm resten under Riskregister.
      </li>
      <li>
        <strong>Bedöm kraven och kontrollerna.</strong> Sätt status för varje krav och kontroll, skriv vad du har sett, ange ansvarig och
        bifoga evidens. Kontroller som inte är tillämpliga väljer du bort under SoA, med en motivering.
      </li>
      <li>
        <strong>Gör en åtgärdsplan.</strong> Verktyget föreslår åtgärder för det som inte är uppfyllt. Gör förslagen till åtgärder och ange
        ansvarig och deadline.
      </li>
      <li>
        <strong>Följ läget och ta fram rapporter.</strong> Översikten visar hur långt kunden har kommit och vad som återstår inför
        revision. Under Rapporter skriver du ut rapporterna som PDF eller laddar ned dem för Word.
      </li>
      <li>
        <strong>Vid nästa bedömning.</strong> Det kan vara inför nästa revision eller vid en uppföljning efter några månader.
        Gå till Uppföljning och välj "Starta nästa bedömning". Då skapas en ny projektfil som utgår från den här, och verktyget visar vad
        som har ändrats sedan förra gången.
      </li>
    </ol>

    <h3>Sparande</h3>
    <ul>
      <li>
        <strong>Använd Chrome eller Edge.</strong> Då sparas projektfilen direkt i mappen när du trycker Spara, och automatiskt var tionde
        minut om något har ändrats.
      </li>
      <li><strong>I Safari och Firefox</strong> laddas filen ned i stället. Flytta den själv till kundens mapp.</li>
      <li>
        <strong>Om webbläsaren kraschar</strong> finns ändringarna kvar i webbläsaren. Nästa gång du öppnar verktyget erbjuds du att
        återställa dem.
      </li>
      <li>
        <strong>Bifogade filer</strong> kopieras till mappen <code>evidens</code> bredvid projektfilen. Flytta alltid projektfilen och
        mappen <code>evidens</code> tillsammans.
      </li>
      <li>
        <strong>Inget skickas över internet.</strong> Kunddata finns bara i kundens mapp och, tills filen är sparad, i din webbläsare.
      </li>
    </ul>

    <h3>Om flera arbetar med samma kund</h3>
    <p>
      Projektfilen är en vanlig fil. Om två personer har den öppen och sparar samtidigt skapar OneDrive en konfliktkopia, och ändringar kan
      gå förlorade. Arbeta därför en i taget: tryck Stäng när du är klar, så sparas filen, innan någon annan öppnar den. Om en
      konfliktkopia ändå uppstår, öppna båda filerna och för över ändringarna för hand.
    </p>
  </div>
</Modal>
