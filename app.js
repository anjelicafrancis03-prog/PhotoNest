const gallery = document.querySelector('#gallery');
const photoCount = document.querySelector('#photo-count');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxTitle = document.querySelector('#lightbox-title');
const lightboxSeries = document.querySelector('#lightbox-series');
const lightboxDetails = document.querySelector('#lightbox-details');
const downloadButton = document.querySelector('#download-button');
const toast = document.querySelector('#toast');
let activePhoto = null;
let toastTimer;

document.querySelector('#year').textContent = new Date().getFullYear();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
}

function makeCard(photo) {
  const card = document.createElement('button');
  card.className = 'gallery-card';
  card.type = 'button';
  card.innerHTML = `
    <img src="${photo.thumbnail || photo.src}" alt="${photo.alt || photo.title}" loading="lazy" decoding="async" />
    <span class="gallery-label"><strong>${photo.title}</strong><small>${photo.year || ''}</small></span>`;
  card.addEventListener('click', () => openLightbox(photo));
  return card;
}

function renderPhotos(photos, mode = 'replace') {
  if (mode === 'replace') gallery.replaceChildren();
  photos.forEach((photo) => gallery.append(makeCard(photo)));
  photoCount.textContent = String(gallery.children.length).padStart(2, '0');
}

function openLightbox(photo) {
  activePhoto = photo;
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt || photo.title;
  lightboxTitle.textContent = photo.title;
  lightboxSeries.textContent = photo.series || 'Photograph';
  lightboxDetails.textContent = [photo.location, photo.year, photo.dimensions].filter(Boolean).join('  ·  ');
  lightbox.showModal();
}

document.querySelector('#close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });

async function downloadPhoto(photo) {
  const source = photo.download || photo.src;
  const name = photo.filename || `${photo.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.jpg`;
  downloadButton.disabled = true;
  downloadButton.textContent = '正在准备…';
  try {
    const response = await fetch(source, { mode: 'cors' });
    if (!response.ok) throw new Error('download unavailable');
    const blob = await response.blob();
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
    showToast(`正在下载「${photo.title}」原图`);
  } catch {
    window.open(source, '_blank', 'noopener');
    showToast('已在新标签页打开原图，可使用浏览器保存。');
  } finally {
    downloadButton.disabled = false;
    downloadButton.innerHTML = '下载原图 <span aria-hidden="true">↓</span>';
  }
}

downloadButton.addEventListener('click', () => activePhoto && downloadPhoto(activePhoto));

const fileInput = document.querySelector('#file-input');
const dropZone = document.querySelector('#drop-zone');
function importFiles(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith('image/'));
  if (!imageFiles.length) return showToast('请选择 JPG、PNG、WebP、AVIF 等图片文件。');
  const localPhotos = imageFiles.map((file) => ({
    title: file.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(file), download: URL.createObjectURL(file), filename: file.name,
    series: 'Local preview', year: new Date().getFullYear(), dimensions: `${(file.size / 1024 / 1024).toFixed(1)} MB`, alt: file.name,
  }));
  renderPhotos(localPhotos, 'append');
  document.querySelector('#collection').scrollIntoView({ behavior: 'smooth' });
  showToast(`已加入 ${imageFiles.length} 张本地照片${imageFiles.some((file) => file.size > 10 * 1024 * 1024) ? '（含超过 10 MB 的原图）' : ''}。`);
}
document.querySelector('#file-picker').addEventListener('click', () => fileInput.click());
document.querySelector('#upload-trigger').addEventListener('click', () => document.querySelector('#upload').scrollIntoView({ behavior: 'smooth' }));
fileInput.addEventListener('change', (event) => importFiles(event.target.files));
['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); }));
['dragleave', 'drop'].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); }));
dropZone.addEventListener('drop', (event) => importFiles(event.dataTransfer.files));
fetch('gallery.json')
  .then((response) => { if (!response.ok) throw new Error('Could not load gallery'); return response.json(); })
  .then((photos) => renderPhotos(photos))
  .catch(() => showToast('作品集暂时无法加载。请检查 gallery.json。'));
