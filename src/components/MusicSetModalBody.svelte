<script>
  export let set;
</script>

<div class="modal-body">
  <form>
    <div class="form-group">
      <label for="title">Tittel</label>
      <input
        type="text"
        class="form-control"
        id="title"
        bind:value={set.title}
        placeholder="Skriv inn tittel" />
    </div>
    <div class="form-group">
      <label for="composer">Komponist</label>
      <input
        type="text"
        class="form-control"
        id="composer"
        bind:value={set.composer}
        placeholder="Skriv inn komponist" />
    </div>
    <div class="form-group">
      <label for="arranger">Arrangør</label>
      <input
        type="text"
        class="form-control"
        id="arranger"
        bind:value={set.arranger}
        placeholder="Skriv inn arrangør" />
    </div>
    <div class="form-group">
      <label for="borrowedFrom">Lånt av</label>
      <input
        type="text"
        class="form-control"
        id="borrowedFrom"
        bind:value={set.borrowedFrom}
        placeholder="Skriv inn hvem settet er lånt av" />
      <small id="borrowedFromHelp" class="form-text text-muted">
        Brukes for å holde kontroll på sett vi ikke eier.
      </small>
    </div>
    <div class="form-group">
      <label for="archiveNumber">Arkivnummer</label>
      <input
        type="number"
        class="form-control"
        id="archiveNumber"
        bind:value={set.archiveNumber}
        placeholder="Velg arkivnummer" />
      <small id="archiveNumberHelp" class="form-text text-muted">
        Dersom feltet settes blankt vil neste ledige nummer i arkivet velges.
      </small>
    </div>
  </form>
</div>
