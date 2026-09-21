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
