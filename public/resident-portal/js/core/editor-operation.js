let busy = false;
// App-level owner: lock the existing editor during async saves/media; never rebuild it.
export async function withEditorOperation(action) {
  if (busy) throw new Error('Portal-Vorgang läuft bereits.');
  busy = true;
  const editor = document.getElementById('editorScreen');
  const previous = editor?.inert;
  if (editor) editor.inert = true;
  try { return await action(); }
  finally { if (editor) editor.inert = previous; busy = false; }
}
