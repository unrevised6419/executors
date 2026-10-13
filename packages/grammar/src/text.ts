/**
 * Word equivalence, used for both keywords and procedure names.
 *
 * Two words are equal when the root-locale collator at `base` strength says
 * so: case and diacritics are ignored (`SFIRSIT` = `sfîrșit`, `ş` = `ș` =
 * `s`, `ё` = `е`), while letters that differ in their base form stay distinct
 * (`й` ≠ `и`, `A_B` ≠ `AB`).
 *
 * The root locale is deliberate. The `ro` collation treats ă, â, î, ș and ț as
 * separate letters, so under it `SFIRSIT` ≠ `SFÎRȘIT`; the same comparison is
 * therefore used for every language, and results never depend on the host.
 */

const collator = new Intl.Collator("und", {
	sensitivity: "base",
	usage: "search",
});

export function sameWord(a: string, b: string): boolean {
	return collator.compare(a.normalize("NFC"), b.normalize("NFC")) === 0;
}
