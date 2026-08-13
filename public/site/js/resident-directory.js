export function residentDirectoryItems(residents, getId, getPhotos) {
  return residents.map(resident => {
    const id = getId(resident);
    return {
      id,
      name: String(resident.name || 'Resident'),
      photo: getPhotos(resident)[0] || '',
      href: `residents.html?resident=${encodeURIComponent(id)}`
    };
  });
}

export function shouldShowResidentDirectory(search, isMobile) {
  return isMobile && !new URLSearchParams(search).has('resident');
}

export function renderResidentDirectory(container, residents, getId, getPhotos) {
  const directory = document.createElement('section');
  directory.className = 'resident-directory';
  directory.setAttribute('aria-labelledby', 'resident-directory-title');
  const title = document.createElement('h1');
  title.id = 'resident-directory-title';
  title.textContent = 'Residents';
  directory.append(title);

  const list = document.createElement('div');
  list.className = 'resident-directory-list';
  residentDirectoryItems(residents, getId, getPhotos).forEach(item => {
    const link = document.createElement('a');
    link.className = 'resident-directory-card';
    link.href = item.href;
    if (item.photo) {
      const image = document.createElement('img');
      image.src = item.photo;
      image.alt = item.name;
      image.loading = 'lazy';
      link.append(image);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'resident-directory-placeholder';
      placeholder.textContent = 'Kein Foto';
      link.append(placeholder);
    }
    const name = document.createElement('strong');
    name.textContent = item.name;
    link.append(name);
    list.append(link);
  });
  directory.append(list);
  container.replaceChildren(directory);
}
