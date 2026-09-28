// Shared placeholder only; each module may replace this with its own content.
export function mountEmpty({ container, item, createCover }) {
  const intro = document.createElement('section'); intro.className = 'detail-intro';
  const cover = document.createElement('div'); cover.className = 'detail-cover'; cover.append(createCover(item));
  const copy = document.createElement('div'); copy.className = 'detail-copy';
  const title = document.createElement('h1'); title.textContent = item.title;
  const text = document.createElement('p'); text.textContent = item.description; copy.append(title,text); intro.append(cover,copy);
  const empty = document.createElement('section'); empty.className = 'empty-collection';
  const heading = document.createElement('h2'); heading.textContent = item.emptyTitle;
  const paragraph = document.createElement('p'); paragraph.textContent = item.emptyText;
  empty.append(heading,paragraph); container.append(intro,empty);
  return () => {};
}
