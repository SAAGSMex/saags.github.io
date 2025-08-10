# 🌌 Sociedad Astronómica de Aguascalientes (SAAGS) — Sitio Oficial

Bienvenido al repositorio del sitio oficial de la **Sociedad Astronómica de Aguascalientes (SAAGS)**. Este sitio es nuestro pequeño observatorio digital: aquí reunimos eventos, imágenes, recursos y actividades para despertar (o reforzar) la fascinación por el cielo.

El código ha ido evolucionando con iteraciones orientadas a: mejor experiencia en tablets y móviles reales, rendimiento inicial (LCP), accesibilidad pragmática y mantenimiento simple sin frameworks pesados.

---

## 🚀 Contenido principal

- **Calendario de eventos:** observaciones públicas, talleres, charlas y fenómenos destacados.
- **Galería de astrofotografía:** imágenes optimizadas (WebP / AVIF cuando aplica) con lightbox adaptado para retratos y horizontales.
- **Difusión y recursos:** noticias, apuntes y enlaces útiles para quienes empiezan.
- **Equipo y contacto:** cómo unirte, colaborar o enviarnos tus fotos.

---

## 🛠️ Stack y decisiones

| Aspecto | Elección | Motivo breve |
|---------|---------|--------------|
| Base | HTML5 + CSS + JS plano + Bootstrap 5 | Rapidez de iteración y bajo coste cognitivo |
| Galería | GLightbox + ajustes CSS propios | Control preciso de retratos / landscape y descripción |
| Rendimiento | Preload hero, imágenes modernas, clamp() tipográfico | Mejora LCP y legibilidad progresiva |
| Accesibilidad | Scroll suave sin contaminar historial, control aria, focus-visible | Minimizar fricción al navegar con teclado |
| Observación DOM | IntersectionObserver dinámico (rootMargin desde --navbar-height) | Evitar zonas tapadas por el navbar persistente |
| QA | Lighthouse + pruebas visuales Playwright | Reproducibilidad y prevención de regresiones de UI |

Extras recientes:
- Navbar optimizada: hamburger antes ( < 992px ) para evitar desbordes en tablets.
- Lightbox refinado por breakpoints (móvil → tablet → desktop) con detección JS de orientación y clase `is-portrait`.
- Ajustes progresivos de galería y tarjetas (densidad, aspect-ratio, espaciados). 
- Eliminación de `height` inline en tarjetas de eventos a favor de `.event-media-wrap`.
- Scripts de pruebas visuales y Lighthouse integrados en `package.json`.

---

## 📁 Estructura (simplificada)

```
index.html            # Página principal y layout
styles.css            # Estilos centralizados (utilidades & componentes)
scripts.js            # Comportamiento: observer, navegación, galería
img/                  # Activos optimizados (WebP/AVIF/JPG)
CalendarioAstro/      # Página / recursos del calendario astronómico
package.json          # Scripts Lighthouse y pruebas visuales
.lighthouserc.json    # Umbrales de auditoría
```

Convención: se prefieren variables CSS globales (`:root`) para alturas, colores y spacings reutilizados; media queries escalonadas para ranges específicos (ej. 768–991.98px) en lugar de sobrescrituras dispersas.

---

## 🤝 Contribuir

¿Tienes una astrofoto, detectaste un bug visual en cierto ancho, o quieres mejorar accesibilidad? Abre un [issue](https://github.com/Sergioloeraco/saags.github.io/issues) con:

1. Descripción breve.
2. Pasos para reproducir (si aplica).
3. Captura / ancho de viewport.

Pull Requests: mantén los cambios centrados (una cosa a la vez) y evita re-formateos masivos para facilitar la revisión.

Formato sugerido de commit: `feat:`, `fix:`, `perf:`, `docs:`, `style:`, `refactor:`, `test:`.

Para astrofotografía añade créditos y equipo usado en la descripción.

---

## 🌐 Desarrollo local

Este es un sitio estático. Puedes servirlo rápidamente con cualquier servidor local (ej. extensiones Live Server, `npx serve`, etc.).

Scripts disponibles (`package.json`):

| Script | Descripción |
|--------|-------------|
| `lh` | Ejecuta Lighthouse headless (Performance, A11y, BP, SEO) y genera `lighthouse-report.json`. |
| `lh:ci` | Corre Lighthouse CI con umbrales definidos en `.lighthouserc.json`. |
| `test:visual` | Pruebas visuales multi-navegador (Playwright) contra baselines. |
| `test:visual:update` | Actualiza baselines de capturas si un cambio es intencional. |

Ejemplo rápido (sirviendo en otro puerto si usas live server):

```bash
npm run lh
```

### Visual regression (Playwright + pixelmatch)
Se generan capturas de vistas clave; si hay difs sobre tolerancia se marca fallo. Útil tras modificar CSS global.

### Lighthouse CI
Umbrales configurados para impedir regresiones fuertes. Ajusta `.lighthouserc.json` si la naturaleza del contenido cambia (más scripts, media pesada, etc.).

## ♿ Accesibilidad (resumen)

- `object-fit:contain` en lightbox evita recortes informativos.
- Ajustes de `scroll-margin-top` para anclas tras navbar fijo.
- `focus-visible` estilizado para navegación por teclado.
- Prevención de uso incorrecto de `aria-hidden` cuando hay foco dentro de la galería.
- Reducciones de movimiento respetan `prefers-reduced-motion`.

Futuras mejoras posibles: contraste dinámico en badges, skip-link inicial, y modo alto contraste.

## ⚡ Rendimiento

- Preload de hoja de estilo crítica y hero (WebP) con `fetchpriority="high"`.
- Compresión tipográfica via `clamp()` evita saltos bruscos.
- Eliminación de atributos inline redundantes y uso de clases reutilizables.
- Lazy loading nativo (`loading="lazy"`) donde aplica.
- Observador de intersección recalculado en orientación/cambio de altura para evitar layout shift en scroll.

Ideas futuras: agregar `content-visibility`, servir imágenes adaptativas por `sizes` y `srcset` completos, y un script build opcional para generar versiones AVIF cuando falten.

## 🌠 Redes y contacto

- **Facebook:** [Grupo SAAGS](https://www.facebook.com/groups/saags/?locale=es_LA)
- **Instagram:** [investel.mx](https://www.instagram.com/investel.mx/)
- **YouTube:** [investel601](https://www.youtube.com/@investel601)
- **Email:** segovia1107@hotmail.com | saagsawb@gmail.com

---

## 📄 Licencia

Uso libre para fines educativos y de divulgación. Créditos de imágenes: cada astrofotografía mantiene su autoría indicada en la galería.

---

¡Explora el universo con nosotros! Si ves algo raro en cierto breakpoint, abre un issue: más ojos = mejor cielo.

---

## 📱 Guía de pruebas responsivas (referencia rápida)

Para asegurar que el sitio funciona correctamente como prototipo multi-dispositivo, validar en estos rangos clave (usar herramientas de DevTools o dispositivos reales):

1. Móviles pequeños (≤ 360px ancho)
  - Verificar que el hero no queda cortado y los botones caben en 1 columna.
  - Navbar colapsa correctamente y no genera scroll horizontal.
  - Calendario pasa a 1 columna (minmax reducido) y los textos no se desbordan.

2. Móviles estándar (375–430px)
  - Botones mantienen legibilidad (fuente ~1rem+).
  - Galería: tarjetas ajustan imagen sin deformación y el botón Ver más ocupa ancho completo si es necesario.

3. Tablets vertical (600–834px)
  - Layout de secciones mantiene márgenes laterales coherentes.
  - Hero mantiene proporción y título no se solapa con navbar.

4. Tablets horizontal / pantallas bajas (altura < 560px)
  - Se aplica reducción de altura del navbar (60px) y el hero se adapta con --vh.

5. Laptops (1024–1366px)
  - Revisión de densidad de texto (no líneas demasiado largas > 85ch).
  - Cards de Actividades mantienen alineación y efecto hover.

6. Desktop amplio (≥ 1440px)
  - Hero no muestra texto excesivamente ancho (clamp aplicado).
  - Calendario distribuye columnas simétricamente (auto-fill minmax).

### Checklist técnico
| Ítem | OK esperado |
|------|-------------|
| No scroll horizontal | body sin overflow-x permanente |
| Navbar colapsable | Se cierra tras click en enlace interno |
| Historial limpio | Navegar secciones no apila entradas innecesarias |
| Galería expandible | Botones Ver más / Ver menos regeneran lightbox |
| Calendario responsive | Grid se adapta sin cortar textos |
| Imágenes fluidas | Sin deformación: `object-fit` correcto |
| Altura móvil estable | Variable `--vh` actualizada en rotación |

### Sugerencia de herramientas
- Chrome DevTools: Panel Dimensions presets + Lighthouse (Performance / Best Practices / SEO / Accessibility).
- Firefox Responsive Design Mode para variaciones de densidad de píxeles.
- Device simulators (o BrowserStack) para validar Safari iOS (ver comportamiento de --vh).

Diagnóstico rápido ante desbordes: revisar padding excesivo, textos sin wrap, o imágenes sin `max-width:100%`.
