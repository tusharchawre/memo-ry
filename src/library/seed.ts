// Dev-only sample library: the mock data from design/ (also used for README screenshots).
// Runs only when the library holds nothing but an empty Inbox. Never real lyrics: placeholders only.
import { createFolder, listFolder, setStatus, writeLyrics, INBOX, joinPath } from './library';

const ALBUM = 'good kid, m.A.A.d city';

export function seedSampleLibrary() {
  const rootListing = listFolder('');
  const onlyInbox = rootListing.folders.length === 1 && rootListing.folders[0].path === INBOX && rootListing.files.length === 0;
  if (!onlyInbox || (rootListing.folders[0].count ?? 0) > 0) return;

  const album = createFolder('', ALBUM);
  for (const song of ['Money Trees', 'Swimming Pools', 'Poetic Justice']) {
    const path = createFolder(album, song);
    writeLyrics(path, {
      title: song,
      preamble: '',
      sections: [
        { heading: 'Verse 1', body: '[ verse 1 lyrics ]', note: song === 'Money Trees' ? '72 bpm, half-spoken, dry vocal.' : '' },
        { heading: 'Hook', body: '[ hook lyrics ]', note: '' },
        { heading: 'Verse 2', body: '[ verse 2 lyrics ]', note: '' },
      ],
    });
  }
  setStatus(joinPath(album, 'Money Trees'), 'writing');
  setStatus(joinPath(album, 'Swimming Pools'), 'producing');
  setStatus(joinPath(album, 'Poetic Justice'), 'idea');

  for (const name of ['DAMN.', 'To Pimp a Butterfly', 'Beats', 'References']) createFolder('', name);
  setStatus('DAMN.', 'done');
}
