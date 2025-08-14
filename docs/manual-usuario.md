# Manual de usuario (actualización de contenido)

Este sitio es 100% estático. Para actualizarlo, edita archivos HTML/CSS/JS con cualquier editor (VS Code recomendado) y sube los cambios a GitHub Pages.

## Requisitos
- Editor de texto (VS Code, Sublime, etc.)
- Conocimientos básicos de HTML (copiar bloques y cambiar textos/URLs)

## 1) Actividades
Archivo: `index.html` → sección `<section id="actividades">`.
1. Duplica un bloque de tarjeta: `<div class="col-md-4 mb-4"> ... </div>`.
2. Cambia la imagen dentro de `<picture>` (usa `.webp` si la tienes) y el texto del `<h5>` y `<p>`.
3. Actualiza el enlace del botón si aplica.

## 2) Galería de astrofotografía
Archivo: `index.html` → `<section id="galeria">`.
1. Duplica una tarjeta.
2. La imagen grande que abre el lightbox se define en el atributo `href` del `<a class="glightbox">`.
3. Usa imágenes WebP o AVIF cuando sea posible. Mantén tamaños similares.

## 3) Calendario
- Resumen: `index.html` → `<section id="calendario">`.
  - Dentro de cada `<article class="mes">` agrega/edita `<li class="evento">`.
- Calendario completo: carpeta `CalendarioAstro/` (abre `calendario-astronomico-2025.html`).

## 4) Equipo
Archivo: `index.html` → `<section id="equipo">`.
- Cambia nombre, rol e imagen en cada `.team-card`.
- Las fotos están en `img/equipo/`.

## 5) Contacto
Archivo: `index.html` → `<section id="contacto">`.
- Edita teléfonos y correos.
- El formulario es demostrativo (`action="#"`), no envía.

## 6) Fondos y apariencia
Archivo: `styles.css`.
- En móviles (<768px) el fondo se aplica con `body::before`.
- En tablets/desktop la capa `.bg-stars` usa fondos adaptados.


## 7) Publicación
- Si usas GitHub Pages, al hacer push a la rama principal, el sitio se actualiza.
- Revisa en móvil (414px), tablet (768px) y laptop (1024px) tras cada cambio.

## 8) Navegación interna y scroll

Los enlaces del menú y botones con ancla (#) hacen scroll suave a la sección correspondiente, descontando la altura real del navbar. Esto evita que el contenido quede tapado o el scroll se "pegue". No hay scroll-jacking ni efectos agresivos.

## 8) Opcional: optimizar CSS
- Ejecuta `npm run build:css` para generar `dist/styles.min.css`.
- Cambia el `<link rel="stylesheet" href="styles.css">` por `dist/styles.min.css` si deseas usar la versión minificada.
