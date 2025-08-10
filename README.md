# 🌌 Sociedad Astronómica de Aguascalientes (SAAGS) — Sitio Oficial

Bienvenido al repositorio del sitio oficial de la **Sociedad Astronómica de Aguascalientes (SAAGS)**, una organización dedicada a la divulgación científica, la observación del cielo y el acercamiento de la astronomía a la sociedad.

Aquí encontrarás información sobre eventos astronómicos, talleres, noticias, recursos educativos y actividades para aficionados, estudiantes y público en general.

---

## 🚀 ¿Qué encontrarás en este sitio?

- **Calendario de eventos y actividades:**  
  Mantente al día con observaciones públicas, conferencias, talleres y ferias astronómicas.

- **Galería de astrofotografía:**  
  Imágenes destacadas tomadas por miembros y colaboradores, con tecnología de última generación.

- **Noticias y fenómenos celestes:**  
  Difusión de novedades científicas y los eventos astronómicos más importantes.

- **Recursos educativos:**  
  Material didáctico y enlaces útiles para aprender astronomía y ciencias del espacio.

- **Información de contacto y redes sociales:**  
  Cómo unirte a la sociedad, participar en actividades o seguirnos en nuestras redes.

---

## 🛠️ Tecnologías utilizadas

- **HTML5** y **CSS3** con [Bootstrap 5](https://getbootstrap.com/) para diseño responsivo y moderno.
- [Font Awesome](https://fontawesome.com/) para iconografía astronómica.
- [Animate.css](https://animate.style/) para animaciones suaves y atractivas.
- [GLightbox](https://glightbox.mcstudios.com.mx/) para galería interactiva de imágenes.
- Imágenes optimizadas en formatos `.jpg`, `.webp` y `.avif` para mejor rendimiento.

---

## 📁 Estructura del proyecto

```
/
├── index.html                # Página principal
├── img/                      # Imágenes y astrofotografía
│   ├── galeria/              # Imágenes de la galería
│   ├── actividades/          # Imágenes de actividades y eventos
│   └── ...                   # Otros recursos gráficos
├── css/                      # Archivos de estilos personalizados
├── js/                       # Scripts personalizados
└── README.md                 # Este archivo
```

---

## 📦 Cómo contribuir

¿Tienes una foto astronómica, noticia, recurso educativo o quieres ayudar con el desarrollo del sitio?  
¡Las contribuciones son bienvenidas! Puedes abrir un [issue](https://github.com/Sergioloeraco/saags.github.io/issues) o enviar un [pull request](https://github.com/Sergioloeraco/saags.github.io/pulls).

---

## 🌠 Contacto y redes

- **Facebook:** [Grupo SAAGS](https://www.facebook.com/groups/saags/?locale=es_LA)
- **Instagram:** [investel.mx](https://www.instagram.com/investel.mx/)
- **YouTube:** [investel601](https://www.youtube.com/@investel601)
- **Email:** segovia1107@hotmail.com | saagsawb@gmail.com

---

## 📄 Licencia

Este proyecto es de uso libre para fines educativos y de divulgación científica.  
Consulta los créditos de imágenes y recursos en la sección correspondiente del sitio.

---

¡Explora el universo con nosotros!

---

## 📱 Guía de pruebas responsivas (2025)

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

### Checklist técnico de validación
| Ítem | OK esperado |
|------|-------------|
| No scroll horizontal | body sin overflow-x salvo lightbox |
| Navbar colapsable | Se cierra al pulsar un enlace |
| Enlaces internos sin contaminar historial | Atrás del navegador no navega entre secciones |
| Galería expandible | Ver más / Ver menos reinyecta lightbox |
| Calendario adaptable | 4→3→2→1 columnas según ancho |
| Imágenes fluidas | max-width:100% y object-fit correcto |
| Altura móvil estable | --vh aplicado en cambios de orientación |

### Sugerencia de herramientas
- Chrome DevTools: Panel Dimensions presets + Lighthouse (Performance / Best Practices / SEO / Accessibility).
- Firefox Responsive Design Mode para variaciones de densidad de píxeles.
- Device simulators (o BrowserStack) para validar Safari iOS (ver comportamiento de --vh).

Si detectas desbordes visuales, buscar primero: paddings grandes, textos sin wrap o imágenes con width fijo.
