/**
 * The instrument photo shown behind a part's download tile, guessed from the
 * part name. Norwegian scanning conventions name parts loosely and
 * inconsistently (e.g. "Ess Kornett" vs "Esskornett"), so this matches on
 * substrings rather than an exact catalogue lookup.
 */
export function getPartImageUrl(partName: string | null | undefined): string {
  const name = (partName ?? "").toLowerCase();
  let file: string;
  switch (true) {
    case name.indexOf("ess kornett") !== -1 ||
      name.indexOf("esskornett") !== -1 ||
      name.indexOf("sopran") !== -1:
      file = "EbCornet.jpg";
      break;
    case name.indexOf("kornett") !== -1 || name.indexOf("repiano") !== -1:
      file = "BbCornet.jpg";
      break;
    case name.indexOf("flygelhorn") !== -1:
      file = "Flugelhorn.jpg";
      break;
    case name.indexOf("horn") !== -1:
      file = "EbHorn.jpg";
      break;
    case name.indexOf("baryton") !== -1:
      file = "Baryton.jpg";
      break;
    case name.indexOf("trombone") !== -1:
      file = "Trombone.jpg";
      break;
    case name.indexOf("euphonium") !== -1:
      file = "Euphonium.jpg";
      break;
    case name.indexOf("tuba") !== -1 || name.indexOf("bass") !== -1:
      file = "Tuba.jpg";
      break;
    case name.indexOf("percussion") !== -1 ||
      name.indexOf("slagverk") !== -1 ||
      name.indexOf("klokkespill") !== -1 ||
      name.indexOf("melodisk") !== -1 ||
      name.indexOf("timpani") !== -1:
      file = "Drums.jpg";
      break;
    case name.indexOf("partitur") !== -1:
      file = "Conductor.jpg";
      break;
    default:
      file = "music-notes-compressed.jpg";
      break;
  }
  return "/img/" + file;
}
