# Manual técnico (mantenimiento)

## Estructura
- `index.html`: todas las secciones del sitio (hero, nosotros, actividades, galería, calendario-resumen, equipo, contacto).
- `styles.css`: estilos globales y media queries. Fondos adaptativos: `.bg-stars` (>=768px) y `body::before` (<768px).
- `scripts.js`: navegación con scroll suave (sin hash persistente), cierre de navbar, IntersectionObserver para activar sección, GLightbox.
- `CalendarioAstro/`: recursos del calendario completo (HTML/CSS/JS dedicado).
- `tests/visual/`: pruebas de regresión visual Playwright.
- `purgecss.config.cjs` y `postcss.config.cjs`: configuración opcional para purgar/minificar CSS.

## Convenciones CSS
- Tokens en `:root` (colores, espaciados, alturas).
- Secciones numeradas y comentarios de bloque para localización rápida.
- Media queries por rangos: `<768px` (móvil), `768–991.98px` (tablet), `>=1024px` (desktop).

## Fondos
- Móvil (<768px): `body::before` fijo al viewport evita artefactos con header fijo.
- Tablet (768–991.98px) y Desktop (>=1024px): `.bg-stars` con `galaxybg_pc.webp`.
- Imágenes en `img/background/`.

## JS clave
- `computeRootMargin()` calcula margen del observer según `--navbar-height`.
- Navegación interna limpia la URL con `history.replaceState`.
- Botones de actividades abren en nueva pestaña con `rel="noopener noreferrer"`.

## Pruebas
- Playwright: corre `node tests/visual/run-visual-tests.mjs` (o `npm run test:visual`).
- Baselines en `tests/visual/baselines/`.

## Optimización CSS (opcional)
1. `npm install` (una vez).
2. `npm run build:css` → genera `dist/styles.min.css`.
3. Enlaza `dist/styles.min.css` en `index.html` para publicar versión minificada.
4. Si agregas clases dinámicas en JS, actúa sobre `safelist` en `purgecss.config.cjs`.

## Despliegue
- GitHub Pages sirve contenido estático desde la rama principal.
- Revisa el sitio tras cada push en: móvil (414px), tablet (768px), laptop (1024px).

## Checklist de mantenimiento
- [ ] Validar Lighthouse local (`npm run lh`).
- [ ] Correr pruebas visuales si hubo cambios de diseño.
- [ ] Comprobar enlaces externos y expirados.
- [ ] Optimizar nuevas imágenes (WebP/AVIF) y pesos razonables.
