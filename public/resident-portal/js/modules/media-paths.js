function publicPrefix() {
  if (location.pathname.includes('/public/')) {
    return location.pathname.slice(0, location.pathname.indexOf('/public/')) + '/public';
  }
  return '/Tille/public';
}

export function mainpageMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url || /^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith('/Tille/public/')) return url;
  if (url.startsWith('/residents/')) return publicPrefix() + url;
  if (url.startsWith('residents/')) return publicPrefix() + '/' + url;
  if (url.startsWith('public/residents/')) return publicPrefix() + '/' + url.replace(/^public\//, '');
  return url;
}

function normalizePhotoList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const url = typeof item === 'string' ? item : (item?.url || item?.src || '');
    return mainpageMediaUrl(url);
  }).filter(Boolean).map(url => ({ url }));
}

export function normalizeResidentMediaPaths(resident) {
  if (!resident) return resident;

  const photos = normalizePhotoList(Array.isArray(resident.photoList) && resident.photoList.length ? resident.photoList : resident.photos);
  resident.photoList = photos;
  resident.photos = photos;

  if (resident.presskitUrl) resident.presskitUrl = mainpageMediaUrl(resident.presskitUrl);
  if (resident.presskit) resident.presskit = mainpageMediaUrl(resident.presskit);
  if (resident.pressKitUrl) resident.pressKitUrl = mainpageMediaUrl(resident.pressKitUrl);

  if (Array.isArray(resident.releases)) {
    resident.releases.forEach(release => {
      const cover = mainpageMediaUrl(release.coverUrl || release.coverImage || release.cover || release.imageUrl || '');
      if (cover) {
        release.coverUrl = cover;
        release.coverImage = cover;
      }
    });
  }

  return resident;
}
