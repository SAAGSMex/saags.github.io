module.exports = {
  content: [
    './index.html',
    './CalendarioAstro/**/*.html',
    './scripts.js'
  ],
  css: ['styles.css'],
  output: 'dist',
  safelist: {
    standard: [
      // Animaciones (animate.css si se incluye externamente) / dinámicas agregadas
      /animate__/,
      'active',
      'show',
      'collapse',
      'collapsing',
      'modal-open',
      'glightbox', 'gslide', 'gslide-description', 'gslide-media', 'glightbox-clean', 'gdesc-inner',
      // Lightbox orientación
      'is-portrait',
      // Clases JS específicas
      'btn-touched', 'glightbox-hidden',
      // Bootstrap utility patterns que podrían aparecer condicionalmente
      /^col-/, /^row$/, /^container/, /^d-/, /^p-/, /^m-/, /^g-/, /^text-/, /^bg-/, /^justify-/, /^align-/, /^position-/, /^top-/, /^end-/, /^badge/, /^btn/,
      // Iconos FontAwesome (prefijos fa-)
      /^fa-/, /^fab$/, /^fas$/, /^fa-solid$/, /^fa-brands$/
    ]
  }
};
