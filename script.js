// Keep the photo placeholder until a supplied image successfully loads.
document.querySelectorAll('.showcase-image').forEach((image) => {
  const frame = image.closest('.showcase-photo');
  const updatePhoto = () => {
    frame.classList.toggle('has-photo', image.hasAttribute('src') && image.complete && image.naturalWidth > 0);
  };
  image.addEventListener('load', updatePhoto);
  image.addEventListener('error', () => frame.classList.remove('has-photo'));
  updatePhoto();
});

const form = document.querySelector('#commission-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = new FormData(form).get('name').trim();
  document.querySelector('#form-note').textContent = `Thank you, ${name}. Your inquiry is ready for Ginny.`;
  form.querySelector('button').textContent = 'Inquiry prepared ✓';
});

// Smooth scroll behavior for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#' && href !== '#top') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});
