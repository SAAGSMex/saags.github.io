# 🌌 Sociedad Astronómica de Aguascalientes (SAAGS) — Sitio Oficial

Bienvenido al repositorio del sitio oficial de la **Sociedad Astronómica de Aguascalientes (SAAGS)**. Este sitio es nuestro pequeño observatorio digital: aquí reunimos eventos, imágenes, recursos y actividades para despertar (o reforzar) la fascinación por el cielo.

El código ha ido evolucionando con iteraciones orientadas a: mejor experiencia en tablets y móviles reales, rendimiento inicial (LCP), accesibilidad pragmática y mantenimiento simple sin frameworks pesados.

---

## 🎯 Objetivo del proyecto

Plataforma web estática para la Sociedad Astronómica de Aguascalientes que centraliza: presentación institucional, actividades, galería de astrofotografía, calendario astronómico, equipo y contacto. Se construyó con HTML5, CSS propio + Bootstrap (CDN) y JavaScript plano, priorizando rendimiento en móviles y accesibilidad básica. Incluye un flujo opcional para purgar/minificar CSS.

## 🚀 Contenido principal

- Inicio/Hero y navegación con anclas.
- Nosotros: objetivos, principios y logros de la SAAGS.
- Actividades y eventos: tarjetas informativas con enlaces externos.
- Galería de astrofotografía: tarjetas con GLightbox (CDN) para ver imágenes.
- Calendario astronómico: resumen en la página principal y enlace a página dedicada en `CalendarioAstro/`.
- Equipo: tarjetas del equipo con redes.
- Contacto: datos y formulario demostrativo (no envía, `action="#"`).

---

## 🛠️ Stack y decisiones

| Aspecto | Elección | Motivo breve |
|---------|---------|--------------|
| Base | HTML5 + CSS + JS plano + Bootstrap 5 | Rapidez de iteración y bajo coste cognitivo |
| Galería | GLightbox + ajustes CSS propios | Control preciso de retratos / landscape y descripción |
| Rendimiento | Preload hero, imágenes modernas, clamp() tipográfico | Mejora LCP y legibilidad progresiva |
| Accesibilidad | Scroll suave sin contaminar historial, control aria, focus-visible | Minimizar fricción al navegar con teclado |
| Navegación interna | Scroll manual que descuenta la altura del navbar | Evita que el scroll se "pegue" o salte mal |
| QA | Pruebas visuales Playwright (incluidas) y Lighthouse (script) | Revisión visual y de rendimiento local |

### Arquitectura lógica

```
index.html   -> Shell principal (SPA por anclas)
styles.css   -> Design tokens + componentes + media queries agrupadas
scripts.js   -> UX/A11y/Lightbox/Navegación sin contaminar historial
CalendarioAstro/ -> Página/calendario extendido (HTML/CSS/JS complementario)
img/         -> Activos optimizados (WebP/AVIF/JPG fallback cuando aplica)
tests/visual -> Pruebas de regresión visual (Playwright + pixelmatch)
```

### Flujo de renderizado crítico
1. HTML base entrega estructura y navbar.
2. CSS crítico (único archivo) se carga temprano (rel estándar).
3. Fondos condicionales según breakpoint / density evitando descargas innecesarias.
4. JS diferido inicializa navegación interna con scroll manual (sin scroll-jacking), y lightbox cuando disponible.

### Acciones automáticas internas
- IntersectionObserver recalcula rootMargin basado en `--navbar-height` (adaptable).
- Resize/orientation: debounce para evitar thrash de layout.
- Enlaces internos: scroll suave y URL limpia sin hash persistente.

Extras recientes:
- Navbar optimizada: hamburger antes ( < 992px ) para evitar desbordes en tablets.
- Lightbox refinado por breakpoints (móvil → tablet → desktop) con detección JS de orientación y clase `is-portrait`.
- Ajustes progresivos de galería y tarjetas (densidad, aspect-ratio, espaciados). 
- Eliminación de `height` inline en tarjetas de eventos a favor de `.event-media-wrap`.
- Scripts de pruebas visuales y Lighthouse integrados en `package.json`.

---

## 📁 Estructura (simplificada)

```
index.html         # Página principal con todas las secciones
styles.css         # Estilos globales y responsive (sin preprocesador)
scripts.js         # Navegación, lightbox y mejoras de UX/A11y (vanilla JS)
CalendarioAstro/   # Calendario astronómico (HTML/CSS/JS propio)
img/               # Imágenes del sitio (WebP/AVIF/JPG/PNG)
tests/visual/      # Pruebas visuales Playwright (baselines incluidas)
purgecss.config.cjs, postcss.config.cjs # Config opcional de purga/minificado CSS
```

Convención: se prefieren variables CSS globales (`:root`) para alturas, colores y spacings reutilizados; media queries escalonadas para ranges específicos (ej. 768–991.98px) en lugar de sobrescrituras dispersas.

---

## 🤝 Contribuir

¿Tienes una astrofoto, detectaste un bug visual en cierto ancho, o quieres mejorar accesibilidad? Abre un issue en el repositorio con: [issue](https://github.com/SAAGSMex/saags.github.io/issues) 

1. Descripción breve.
2. Pasos para reproducir (si aplica).
3. Captura / ancho de viewport.


Pull Requests: mantén los cambios centrados (una cosa a la vez) y evita re-formateos masivos para facilitar la revisión.

Formato sugerido de commit: `feat:`, `fix:`, `perf:`, `docs:`, `style:`, `refactor:`, `test:`.

Para astrofotografía añade créditos y equipo usado en la descripción.

---

## 🌐 Sitio web

https://saagsmex.github.io/saags.github.io/

---

## 🔧 Instalación / Desarrollo local

Este es un sitio estático. Puedes servirlo rápidamente con cualquier servidor local (ej. extensiones Live Server, `npx serve`, etc.).

Scripts disponibles (`package.json`):

| Script | Descripción |
|--------|-------------|
| `lh` | Ejecuta Lighthouse headless (Performance, A11y, BP, SEO) y genera `lighthouse-report.json`. |
| `lh:ci` | Autorun de LHCI (requiere configuración adicional, no incluida por defecto). |
| `test:visual` | Pruebas visuales multi-navegador (Playwright) contra baselines. |
| `test:visual:update` | Actualiza baselines de capturas si un cambio es intencional. |
| `build:css` | Purga y minifica `styles.css` (salida en `dist/`). |

Ejemplo rápido (sirviendo en otro puerto si usas live server):

```bash
npm run lh
```

### Visual regression (Playwright + pixelmatch)
Se generan capturas de vistas clave; si hay difs sobre tolerancia se marca fallo. Útil tras modificar CSS global.

### Lighthouse
Puedes usar `npm run lh` para una auditoría local puntual (no hay configuración de CI incluida).


## ♿ Accesibilidad (resumen)

- `object-fit:contain` en lightbox evita recortes informativos.
- El scroll a secciones descuenta la altura del navbar de forma precisa (sin scroll-jacking).
- `focus-visible` estilizado para navegación por teclado.
- Prevención de uso incorrecto de `aria-hidden` cuando hay foco dentro de la galería.
- Reducciones de movimiento respetan `prefers-reduced-motion`.

Futuras mejoras posibles: contraste dinámico en badges, skip-link inicial, y modo alto contraste.

## 📊 Métricas & Rendimiento

- Preload de hoja de estilo crítica y hero (WebP) con `fetchpriority="high"`.
- Compresión tipográfica via `clamp()` evita saltos bruscos.
- Eliminación de atributos inline redundantes y uso de clases reutilizables.
- Lazy loading nativo (`loading="lazy"`) donde aplica.
- Observador de intersección recalculado en orientación/cambio de altura para evitar layout shift en scroll.

Ideas futuras: agregar `content-visibility`, servir imágenes adaptativas por `sizes` y `srcset` completos, y un script build opcional para generar versiones AVIF cuando falten.

## 🧪 Optimización de CSS (purga y minificado)

Se agregó un flujo opcional para generar una hoja reducida:

1. `npm run purge:css` analiza `index.html`, `CalendarioAstro/*.html` y `scripts.js` y crea `dist/styles.css` sin selectores no utilizados.
2. `npm run minify:css` aplica Autoprefixer + cssnano y genera `dist/styles.min.css`.
3. `npm run build:css` ejecuta ambos.

Safelist (evita eliminaciones inseguras) definido en `purgecss.config.cjs`: incluye patrones dinámicos (`animate__`, `fa-`, utilidades Bootstrap, clases GLightbox, etc.). Si agregas clases vía JS recuerda añadirlas ahí.

Integración manual: enlaza `dist/styles.min.css` en `index.html` si decides usar la versión optimizada para producción.

---

## 🧰 ¿Cómo actualizar el contenido?

Todo el contenido visible está en HTML/JS/CSS. No hay panel de administración.

- Actividades: en `index.html`, sección `<section id="actividades">` duplica una tarjeta (`<div class="col-md-4 mb-4">...</div>`) y actualiza imágenes/textos/enlaces.
- Galería: en `<section id="galeria">` duplica un bloque de tarjeta. La imagen grande se referencia dentro de `<a class="glightbox" href="img/...">`.
- Calendario (resumen): en `index.html`, `<section id="calendario">` edita los `<article class="mes">` y sus `<li class="evento">`.
- Calendario completo: en `CalendarioAstro/` edita `calendario-astronomico-2025.html` y `calendario-astronomico-2025.js/css`.
- Equipo: en `<section id="equipo">` edita cada tarjeta (`.team-card`). Las fotos están en `img/equipo/`.
- Contacto: teléfonos/emails se editan en la sección `<section id="contacto">`. El formulario es demostrativo (`action="#"`).
- Fondos: se controlan desde `styles.css` con reglas por media query. En móviles `<768px` se usa `body::before` fijo; en tablets/desktop la capa `.bg-stars` aplica el fondo.

Consejos:
- Mantén nombres/formatos de imagen consistentes (preferir WebP/AVIF). 
- Previsualiza en 414px, 768px, 1024px y 1366px.
- Si cambias clases desde JS, añade a la safelist de `purgecss.config.cjs` antes de ejecutar `build:css`.

---

## 📄 Manuales
Además de este README, se incluyen dos documentos en `docs/` para convertir a Word si se requiere entregar en `.docx`:
- `docs/manual-usuario.md`: guía paso a paso para actualizar secciones, imágenes y calendario.
- `docs/manual-tecnico.md`: estructura del proyecto, estilos, scripts y flujo de optimización.

También está disponible un manual en formato Word listo para su uso en `docs/manual-saags.docx`.

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

---

## 🧭 Roadmap sugerido

| Fase | Mejora | Justificación |
|------|--------|---------------|
| 1 | Generar `sitemap.xml` y `robots.txt` | SEO básico y descubribilidad |
| 1 | Agregar `aria-live` a mensajes dinámicos (formularios futuros) | Mejor feedback para lectores de pantalla |
| 2 | Content-visibility y lazy hydration opcional en secciones fuera de viewport | Reducir trabajo de render inicial |
| 2 | Generador de versiones AVIF/WebP desde origen JPG/PNG vía script Sharp | Consistencia de formatos modernos |
| 3 | Modo oscuro adaptativo (prefer-color-scheme) invertido / alto contraste | Inclusión y ergonomía visual |
| 3 | Integrar analítica privacy‑friendly (plausible / umami) | Métricas sin rastreo invasivo |

## 🔐 Consideraciones de seguridad
- Todos los enlaces externos forzados a `rel="noopener noreferrer"` para aislar contexto.
- Sin almacenamiento local de datos sensibles (sitio informativo).
- Dependencias mínimas auditables en `devDependencies` (actualizar periódico).

## ♻️ Estrategia de mantenimiento
- Prefijos y tokens centralizados permiten refactor rápido de paleta.
- Safelist PurgeCSS evita regressions al limpiar CSS; revisar tras añadir nuevas animaciones.
- Pruebas visuales detectan degradaciones en layouts clave.

## ✅ Resumen de buenas prácticas aplicadas
| Área | Práctica | Resultado |
|------|----------|-----------|
| Rendimiento | Imágenes modernas + lazy + fondos condicionales | Menor LCP y ahorro de datos |
| Accesibilidad | Scroll-margin, aria-current, focus-visible, roles | Navegación clara teclado/lector |
| UX | Menú autocolapsable y scroll suave sin historial | Experiencia limpia y predecible |
| Código | Secciones numeradas + design tokens | Facilitado onboarding y refactor |
| Resiliencia | Safelist PurgeCSS + tests visuales | Menos riesgo de romper UI al optimizar |

