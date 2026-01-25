// Lightbox functionality for gallery
const lightbox = document.getElementById('lightbox') as HTMLElement;
const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement;
const lightboxClose = document.getElementById('lightbox-close') as HTMLButtonElement;
const lightboxPrev = document.getElementById('lightbox-prev') as HTMLButtonElement;
const lightboxNext = document.getElementById('lightbox-next') as HTMLButtonElement;
const galleryItems = document.querySelectorAll('.gallery-item') as NodeListOf<HTMLElement>;

let currentIndex = 0;
const images: { src: string; alt: string }[] = [];

// Collect all images from gallery
galleryItems.forEach((item, index) => {
  const img = item.querySelector('.gallery-image') as HTMLImageElement;
  if (img) {
    images.push({
      src: img.src,
      alt: img.alt || `Image ${index + 1}`
    });

    // Open lightbox on click
    item.addEventListener('click', () => {
      openLightbox(index);
    });
  }
});

function openLightbox(index: number) {
  currentIndex = index;
  updateLightboxImage();
  lightbox?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox?.classList.remove('active');
  document.body.style.overflow = '';
}

function updateLightboxImage() {
  if (lightboxImage && images[currentIndex]) {
    lightboxImage.src = images[currentIndex].src;
    lightboxImage.alt = images[currentIndex].alt;
  }
}

function showNext() {
  currentIndex = (currentIndex + 1) % images.length;
  updateLightboxImage();
}

function showPrev() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  updateLightboxImage();
}

// Event listeners
lightboxClose?.addEventListener('click', closeLightbox);
lightboxNext?.addEventListener('click', showNext);
lightboxPrev?.addEventListener('click', showPrev);

// Close lightbox when clicking on background
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    closeLightbox();
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!lightbox?.classList.contains('active')) return;

  switch (e.key) {
    case 'Escape':
      closeLightbox();
      break;
    case 'ArrowRight':
      showNext();
      break;
    case 'ArrowLeft':
      showPrev();
      break;
  }
});
