import { mergeResidentNews, patchResidentNews } from './residents-news-csv-model.js?v=resident-news-csv-1';

export async function saveResidentNewsImport({ client, path, residentId, previewRows, confirmed }) {
  if (!confirmed) throw new Error('Import wurde nicht bestätigt.');
  const fresh = await client.getTextFile(path);
  let latest;
  try { latest = JSON.parse(fresh.text); }
  catch (error) { throw new Error(`residents.json ist ungültig: ${error.message}`); }
  const matches = Array.isArray(latest?.residents) ? latest.residents.filter(resident => resident?.id === residentId) : [];
  if (matches.length !== 1) return { document: patchResidentNews(latest, residentId, []), imported: 0 };
  const existing = Array.isArray(matches[0].newsItems) ? matches[0].newsItems : [];
  const nextNewsItems = mergeResidentNews(existing, previewRows);
  const imported = nextNewsItems.length - existing.length;
  if (!imported) throw new Error('Keine importierbaren News vorhanden.');
  const document = patchResidentNews(latest, residentId, nextNewsItems);
  let response;
  try {
    response = await client.putTextFile(path, JSON.stringify(document, null, 2) + '\n', fresh.sha, 'Import resident news from CSV');
  } catch (error) {
    if (error?.status === 409) throw new Error('residents.json hat sich seit dem Laden verändert. Bitte Import erneut prüfen.');
    throw new Error(`GitHub-Speichern fehlgeschlagen: ${error.message}`);
  }
  return { document, imported, sha: response?.content?.sha || fresh.sha };
}
