/**
 * SAAGS – scripts.js
 * ------------------------------------------------------------------
 * Rol: Funcionalidad interactiva y mejoras UX/A11y sin frameworks.
 * Alcance principal:
 *  0. Ajuste dinámico de viewport (--vh) en móviles.
 *  1. Animaciones progresivas para CTA inicial.
 *  2. Cierre inteligente del navbar tras navegación.
 *  3. IntersectionObserver para resaltar sección activa.
 *  3.b Navegación interna sin ensuciar historial (# limpio) con smooth scroll.
 *  4. Gestión avanzada de enlaces (externos / internos / botones actividad).
 *  5. Inicialización y adaptación GLightbox (orientación vertical/horizontal).
 *  6. Galería expandible (Ver más / Ver menos) con recarga dinámica de lightbox.
 *  7. Validación / mensajes UX (placeholder futuro: formularios de contacto, etc.).
 *  8. Salvaguarda de clases dinámicas (ver safelist PurgeCSS) – mantener sincronizadas.
 *
 * Principios:
 *  - No contaminar historial: replaceState sobre pushState.
 *  - Accesibilidad: aria-labels, aria-current, roles claros.
 *  - Rendimiento: listeners mínimos, debounce de resize, lazy lightbox.
 *  - Idempotencia: funciones que pueden reconstruirse tras cambios (observer rebuild).
 *
 * Mantenimiento:
 *  - Añadir nuevas clases dinámicas → safelist en purgecss.config.cjs.
 *  - Evitar dependencias globales nuevas; si son imprescindibles documentar en README.
 *  - Prefijo JS-only: `.js-` recomendado para futuros selectores si se amplía.
 *
 * Última actualización doc: 2025-08-10
 */

// Script Personalizado
document.addEventListener('DOMContentLoaded', function() {
    // Helper para aislar fallas por sección sin romper toda la inicialización
    function safeSection(name, fn) {
        try { fn(); } catch (err) { console.warn(`[init:${name}]`, err); }
    }
    // 0. Ajuste de viewport alto dinámico en móviles (usa --vh en CSS)
    safeSection('vh', () => {
        (function fixMobileVH(){
            function setVh() {
                const vh = window.innerHeight * 0.01; // 1vh real
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            }
            let rAF, lastCall = 0;
            function onResize(){
                const now = Date.now();
                if (now - lastCall < 90) { // debounce simple
                    cancelAnimationFrame(rAF);
                    rAF = requestAnimationFrame(setVh);
                    return;
                }
                lastCall = now;
                setVh();
            }
            window.addEventListener('resize', onResize, { passive: true });
            setVh();
        })();
    });
    // 1. Animación del botón "Nuestras actividades"
    safeSection('cta-anim', () => {
        const btnActividades = document.getElementById('btn-actividades');
        if (btnActividades) {
            btnActividades.addEventListener('animationend', function(e) {
                if (e.animationName === 'fadeInUp') {
                    btnActividades.classList.remove('animate__fadeInUp');
                    btnActividades.classList.add('animate__pulse', 'animate__infinite');
                }
            }, { once: true });
        }
    });

    // 2. LÓGICA PARA CERRAR NAVBAR (SIN INTERFERIR EN NAVEGACIÓN)
    // Seleccionamos TODOS los enlaces dentro del menú desplegable
    safeSection('navbar-collapse', () => {
        const navLinksInMenu = document.querySelectorAll('#navbarNav .nav-link');
        const navbarCollapse = document.getElementById('navbarNav');
        // Evitar ReferenceError si bootstrap no está cargado aún
        const bsCollapse = (navbarCollapse && window.bootstrap && typeof window.bootstrap.Collapse === 'function')
            ? new window.bootstrap.Collapse(navbarCollapse, { toggle: false })
            : null;

        navLinksInMenu.forEach(link => {
            link.addEventListener('click', () => {
                // NO hay e.preventDefault(). Dejamos que el enlace funcione 100% nativo.
                // Si el menú está abierto, lo cerramos.
                if (bsCollapse && navbarCollapse.classList.contains('show')) {
                    bsCollapse.hide();
                }
            });
        });
    });

    // 3. RESALTADO ACTIVO EFICIENTE CON INTERSECTION OBSERVER (dinámico según altura del navbar)
    const sections = document.querySelectorAll('section[id]');
    const navLinksForObserver = document.querySelectorAll('.navbar-nav .nav-link');

    safeSection('sections-observer', () => {
        let sectionObserver = null;

        function computeRootMargin() {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height').trim();
            const px = parseFloat(raw) || 76;
            return `-${px}px 0px -40% 0px`;
        }

        function buildObserver() {
            if (sectionObserver) sectionObserver.disconnect();
            const options = { root: null, rootMargin: computeRootMargin(), threshold: 0 };
            sectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinksForObserver.forEach(link => {
                            link.classList.remove('active');
                            link.removeAttribute('aria-current');
                        });
                        const activeLink = document.querySelector(`.navbar-nav a[href="#${id}"]`);
                        if (activeLink) {
                            activeLink.classList.add('active');
                            activeLink.setAttribute('aria-current', 'page');
                        }
                    }
                });
            }, options);
            sections.forEach(section => { if (section.id) sectionObserver.observe(section); });
        }

        buildObserver();
        let resizeTO = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTO);
            resizeTO = setTimeout(buildObserver, 160);
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(buildObserver, 120);
        });
    });

    // 3.b NAVEGACIÓN INTERNA SIN AGREGAR ENTRADAS AL HISTORIAL
    // Objetivo:
    //  - Mantener los href="#seccion" (SEO / accesibilidad) pero evitar que cada click añada una entrada en el historial.
    //  - Limitar la navegación interna SOLO a:
    //      * Enlaces del navbar.
    //      * Botones/enlaces que el autor marque con la clase .scroll-link o data-scroll
    //  - Otros enlaces internos con # (no autorizados) no harán scroll (para cumplir el requisito).
    //  - Actualizamos la URL con replaceState (o history.replaceState) para no crear nueva entrada.
    //  - Añadimos smooth scroll y sincronizamos el estado activo del navbar al instante.

    const internalNavSelectors = [
        '#navbarNav .nav-link[href^="#"]',          // enlaces del menú principal
        '.navbar-brand[href^="#"]',                // logo (#inicio)
        '.footer .list-unstyled a[href^="#"]',     // enlaces rápidos footer
        'a.scroll-link[href^="#"]',                // enlaces marcados
        '[data-scroll][href^="#"]',                // atributo data-scroll
        'a.btn[href^="#"]'                         // botones con hash
    ];
    const allowedInternalLinks = document.querySelectorAll(internalNavSelectors.join(','));
    const NAV_ACTIVE_CLASS = 'active';
    // Configuración: si quieres actualizar el hash sin crear historial pon a true.
    const UPDATE_HASH = false; // Requisito: mantener URL limpia sin #

    function clearHashFromUrl() {
        // Elimina cualquier hash visible sin crear nueva entrada de historial
        const clean = location.pathname + location.search;
        try { history.replaceState(null, '', clean); } catch(_) {}
    }

    function activarLinkPorHash(hash) {
        if (!hash) return;
        const id = hash.replace('#','');
        navLinksForObserver.forEach(l => { l.classList.remove(NAV_ACTIVE_CLASS); l.removeAttribute('aria-current'); });
        const candidate = document.querySelector(`.navbar-nav a[href="#${id}"]`);
        if (candidate) {
            candidate.classList.add(NAV_ACTIVE_CLASS);
            candidate.setAttribute('aria-current','page');
        }
    }

    safeSection('internal-nav', () => {
        allowedInternalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
            const hash = link.getAttribute('href');
            if (!hash || !hash.startsWith('#')) return; // no interno
            // Siempre prevenimos para cualquier hash (incluyendo '#') para que nunca ensucie la URL.
            e.preventDefault();
            // Caso especial: href="#" (sin destino) => sólo limpiamos el hash si aparece temporalmente.
            if (hash === '#' || hash.length === 1) {
                clearHashFromUrl();
                return;
            }
            const id = hash.slice(1);
            const destino = document.getElementById(id);
            if (destino) {
                destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
                activarLinkPorHash(hash);
            }
            // Incluso si no existe el destino, evitamos que el hash quede en la barra.
            if (!UPDATE_HASH) {
                clearHashFromUrl();
            } else {
                try { history.replaceState(null, '', hash); } catch(_) {}
            }
            if (bsCollapse && navbarCollapse.classList.contains('show')) bsCollapse.hide();
            });
        });
    });

    // Neutralizamos otros enlaces internos (no permitidos) para que no gestionen navegación
    // pero conservamos su href para SEO / accesibilidad (solo evitamos el scroll por hash).
    safeSection('neutralize-other-hash', () => {
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            if ([...allowedInternalLinks].includes(a)) return; // permitido
            a.addEventListener('click', (e) => {
                e.preventDefault();
            });
        });
    });

    // (Opcional) Activar el link correspondiente si la página carga ya con un hash
    safeSection('initial-hash', () => {
      if (location.hash) {
        const initial = location.hash;
        const target = document.getElementById(initial.substring(1));
        if (target) {
            // Ejecutamos scroll manual y luego limpiamos hash para que desaparezca de la barra.
            setTimeout(() => {
                // 'instant' no es estándar; usar 'auto' para máxima compatibilidad
                target.scrollIntoView({ behavior: 'auto', block: 'start' });
                activarLinkPorHash(initial);
                if (!UPDATE_HASH) clearHashFromUrl();
            }, 15);
        } else if (!UPDATE_HASH) {
            clearHashFromUrl();
        }
      }
    });

    // 4. GESTIÓN AVANZADA DE ENLACES (REFACTORIZADA)
    // 4.1 Botones de tarjetas de actividad: efecto visual + apertura inmediata en nueva pestaña SIN contaminar historial
    document.querySelectorAll('#actividades .card-footer .btn[href]').forEach(btn => {
        const rawHref = btn.getAttribute('href') || '';
        const isInternalHash = rawHref.startsWith('#');
        if (!isInternalHash) {
            btn.setAttribute('rel','noopener noreferrer');
            btn.setAttribute('target','_blank');
        } else {
            btn.setAttribute('role','button');
            btn.setAttribute('aria-disabled','false');
        }
        if (!btn.classList.contains('js-enhanced')) {
            btn.classList.add('js-enhanced');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.classList.add('btn-touched');
                btn.blur();
                // Abrimos inmediatamente para que el navegador lo considere acción directa del usuario
                if (!isInternalHash) {
                    try { window.open(btn.href, '_blank', 'noopener,noreferrer'); } catch(_) {}
                }
                // Quitamos efecto en el siguiente frame para asegurar repaint
                setTimeout(() => btn.classList.remove('btn-touched'), 180);
            });
        }
    });

    // 4.2 Enlaces externos reales (excluye: botones ya tratados, mismos host, cualquier href con hash interno del mismo host)
    document.querySelectorAll('a[href^="http"]').forEach(a => {
        if (a.closest('#actividades .card-footer')) return; // ya gestionado arriba
        const sameHost = a.hostname === window.location.hostname;
        if (sameHost) return; // dejamos que funcione nativo (podría ser otra página interna)
        // Evitar forzar target si ya definido manualmente
        if (!a.hasAttribute('target')) a.setAttribute('target','_blank');
        const existingRel = a.getAttribute('rel') || '';
        if (!/noopener/.test(existingRel) || !/noreferrer/.test(existingRel)) {
            a.setAttribute('rel', (existingRel + ' noopener noreferrer').trim());
        }
    });

    // 5. INICIALIZACIÓN DE GLIGHTBOX
    // Antes de inicializar: quitar la clase .glightbox a los enlaces dentro de la galería oculta
    // para que NO formen parte del conjunto navegable inicialmente.
    // GLightbox: lazy-init sólo si hay elementos en DOM y la librería está presente
    let hiddenGalleryAnchors = [];
    const hiddenGalleryContainerPre = document.getElementById('galeria-oculta');
    safeSection('glightbox-prepare', () => {
        if (hiddenGalleryContainerPre) {
            hiddenGalleryAnchors = hiddenGalleryContainerPre.querySelectorAll('a.glightbox');
            hiddenGalleryAnchors.forEach(a => {
                a.classList.add('glightbox-hidden');
                a.classList.remove('glightbox');
            });
        }
    });

    let saagsLightbox = null;
    function initGLightbox() {
        if (saagsLightbox) return;
        if (!document.querySelector('.glightbox')) return; // no hay elementos visibles
        if (!(window.GLightbox && typeof window.GLightbox === 'function')) return;
        saagsLightbox = window.GLightbox({
            selector: '.glightbox',
            touchNavigation: true,
            loop: false,
            closeButton: true
        });
        window.saagsLightbox = saagsLightbox;
        const applyOrientationClasses = () => {
            const slides = document.querySelectorAll('.glightbox-container .gslide');
            slides.forEach(slide => {
                const img = slide.querySelector('.gslide-media img');
                if (!img) return;
                const setClass = () => {
                    if (img.naturalWidth && img.naturalHeight) {
                        slide.classList.toggle('is-portrait', img.naturalHeight > img.naturalWidth);
                    }
                };
                if (img.complete) setClass(); else img.addEventListener('load', setClass, { once: true });
            });
        };
        saagsLightbox.on('open', () => {
            applyOrientationClasses();
            const galeriaSection = document.getElementById('galeria');
            if (galeriaSection && galeriaSection.hasAttribute('aria-hidden')) galeriaSection.removeAttribute('aria-hidden');
        });
        saagsLightbox.on('slide_changed', () => {
            applyOrientationClasses();
            const galeriaSection = document.getElementById('galeria');
            if (galeriaSection && galeriaSection.hasAttribute('aria-hidden')) galeriaSection.removeAttribute('aria-hidden');
        });
    }
    // Inicialización ociosa (sin bloquear interacción). No afecta el scroll en móvil.
    safeSection('glightbox-idle-init', () => {
        const lazy = () => initGLightbox();
        if ('requestIdleCallback' in window) requestIdleCallback(lazy, { timeout: 1200 }); else setTimeout(lazy, 600);
    });

    // Observa mutaciones para impedir aria-hidden en #galeria cuando un link tiene focus
    safeSection('galeria-aria-guard', () => {
        const galeriaSec = document.getElementById('galeria');
        if (galeriaSec) {
            const mo = new MutationObserver(() => {
                if (galeriaSec.hasAttribute('aria-hidden')) {
                    const active = document.activeElement;
                    if (active && galeriaSec.contains(active)) galeriaSec.removeAttribute('aria-hidden');
                }
            });
            mo.observe(galeriaSec, { attributes:true, attributeFilter:['aria-hidden'] });
        }
    });

    // --- FUNCIONALIDAD PARA EL BOTÓN "VER MÁS FOTOGRAFÍAS" Y "VER MENOS FOTOGRAFÍAS" ---
    const btnVerMas = document.getElementById('btn-ver-mas');
    const btnVerMenos = document.getElementById('btn-ver-menos');
    const galeriaOculta = document.getElementById('galeria-oculta');

    if (btnVerMas && btnVerMenos && galeriaOculta) {
        // Ya existe una instancia global (saagsLightbox). Usamos esa referencia.
        const lightboxRef = () => { if (!saagsLightbox) initGLightbox(); return saagsLightbox; };
        // Referencia a los anchors ocultos (ya sin la clase .glightbox).
        const hiddenAnchors = galeriaOculta.querySelectorAll('a.glightbox-hidden');

        // Funcionalidad para el botón "Ver más" con animación suave
        btnVerMas.addEventListener('click', function(e) {
            e.preventDefault();
            // Animamos desaparición del botón "Ver más"
            btnVerMas.classList.remove('btn-galeria-anim-show');
            btnVerMas.classList.add('btn-galeria-anim-hide');
            // Al terminar la animación ocultamos y mostramos galería
            const onHideEnd = () => {
                btnVerMas.style.display = 'none';
                btnVerMas.removeEventListener('animationend', onHideEnd);
                // Mostrar galería animada
                galeriaOculta.classList.remove('d-none');
                galeriaOculta.classList.add('galeria-anim-enter');
                // Mostrar botón "Ver menos" con animación de entrada
                btnVerMenos.classList.remove('d-none');
                btnVerMenos.classList.add('btn-galeria-anim-show');
                // Agregar nuevamente la clase .glightbox a los anchors ocultos para que ahora sí participen
                hiddenAnchors.forEach(a => {
                    a.classList.add('glightbox');
                });
                // Inicializar/reload lightbox cuando sea necesario
                const lb = lightboxRef();
                if (lb) lb.reload();
            };
            btnVerMas.addEventListener('animationend', onHideEnd);
        });

        // Funcionalidad para el botón "Ver menos" con animación de cierre
        btnVerMenos.addEventListener('click', function(e) {
            e.preventDefault();
            // Animar salida de la galería
            galeriaOculta.classList.remove('galeria-anim-enter');
            galeriaOculta.classList.add('galeria-anim-exit');
            const onGalleryExit = () => {
                galeriaOculta.classList.add('d-none');
                galeriaOculta.classList.remove('galeria-anim-exit');
                galeriaOculta.removeEventListener('animationend', onGalleryExit);
            };
            galeriaOculta.addEventListener('animationend', onGalleryExit);
            // Animar botón "Ver menos" y re-aparecer "Ver más"
            btnVerMenos.classList.remove('btn-galeria-anim-show');
            btnVerMenos.classList.add('btn-galeria-anim-hide');
            const onHideMenos = () => {
                btnVerMenos.classList.add('d-none');
                btnVerMenos.classList.remove('btn-galeria-anim-hide');
                btnVerMenos.removeEventListener('animationend', onHideMenos);
                // Reaparece "Ver más"
                btnVerMas.style.display = 'inline-block';
                btnVerMas.classList.remove('btn-galeria-anim-hide');
                btnVerMas.classList.add('btn-galeria-anim-show');
                // Quitar de nuevo la clase .glightbox para que no sean navegables
                hiddenAnchors.forEach(a => {
                    a.classList.remove('glightbox');
                });
                const lb = lightboxRef();
                if (lb) lb.reload();
            };
            btnVerMenos.addEventListener('animationend', onHideMenos);
        });
    }

    // 6. VALIDACIÓN DE FORMULARIOS Y MEJORAS DE UX
    // Función accesible para mostrar mensaje de error
    function mostrarMensajeError(input, mensaje) {
        let errorDiv = document.createElement('div');
        errorDiv.className = 'mensaje-error alert alert-danger mt-2 py-2 px-3';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('aria-live', 'assertive');
        errorDiv.textContent = mensaje;
        if (input.parentElement.classList.contains('input-group')) {
            input.parentElement.parentElement.appendChild(errorDiv);
        } else {
            input.parentElement.appendChild(errorDiv);
        }
        setTimeout(() => { errorDiv.remove(); }, 5000);
    }

    // Función accesible para mostrar mensaje de éxito
    function mostrarMensajeExito(parent, mensaje) {
        let mensajePrevio = parent.querySelector('.mensaje-exito');
        if (mensajePrevio) mensajePrevio.remove();
        const div = document.createElement('div');
        div.className = 'mensaje-exito alert alert-success mt-2 mb-0 py-2 px-3 text-center';
        div.setAttribute('role', 'status');
        div.setAttribute('aria-live', 'polite');
        div.textContent = mensaje;
        parent.appendChild(div);
        setTimeout(() => { div.remove(); }, 4000);
    }

    // Formulario de Contacto
    const contactoForm = document.querySelector('#contacto form');
    if (contactoForm) {
        contactoForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevenimos el envío real, ya que es un demo
            contactoForm.querySelectorAll('.mensaje-error').forEach(el => el.remove());
            let valido = true;
            const nombre = contactoForm.querySelector('#nombre');
            const email = contactoForm.querySelector('#email');
            const asunto = contactoForm.querySelector('#asunto');
            const mensaje = contactoForm.querySelector('#mensaje');

            // Si faltan campos, evitar errores y marcar como inválido con mensajes genéricos
            if (!nombre || !email || !asunto || !mensaje) {
                console.warn('[contacto] Campos esperados no encontrados');
                valido = false;
            }

            if (nombre && !nombre.value.trim()) {
                mostrarMensajeError(nombre, "El nombre es obligatorio.");
                valido = false;
            }
            if (email && (!email.value.trim() || !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email.value))) {
                mostrarMensajeError(email, "Introduce un correo electrónico válido.");
                valido = false;
            }
            if (asunto && !asunto.value.trim()) {
                mostrarMensajeError(asunto, "El asunto es obligatorio.");
                valido = false;
            }
            if (mensaje && !mensaje.value.trim()) {
                mostrarMensajeError(mensaje, "El mensaje es obligatorio.");
                valido = false;
            }

            if (valido) {
                try { contactoForm.reset(); } catch(_) {}
                mostrarMensajeExito(contactoForm, "¡Mensaje enviado con éxito! (demostración)");
            }
        });
    }

    // Boletín Informativo (footer)
    const newsletterForm = document.querySelector('.footer form, footer form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevenimos el envío real
            newsletterForm.querySelectorAll('.mensaje-error').forEach(el => el.remove());
            const newsletterInput = newsletterForm.querySelector('input[type="email"]');
            if (!newsletterInput || !newsletterInput.value.trim() || !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(newsletterInput.value)) {
                mostrarMensajeError(newsletterInput, "Introduce un correo electrónico válido.");
                return;
            }
            newsletterInput.value = '';
            const successParent = newsletterForm.querySelector('.input-group') || newsletterForm;
            mostrarMensajeExito(successParent, "¡Te has suscrito con éxito!");
        });
    }

    // 7. CONTROL DE BOTONES ATRÁS / ADELANTE DEL NAVEGADOR
    // Requisito: solo deben permitir salir del sitio (previa confirmación / doble pulsación),
    // ya que la navegación interna no crea historial. Implementamos un 'back trap' suave.
    safeSection('back-trap', () => {
    (function configurarBackTrap(){
        if (!window.history || !history.pushState) return;
        const EXIT_WINDOW_MS = 1400; // tiempo para segunda pulsación
        let ultimaPulsacion = 0;
        let activo = true;
        const SENTINEL_KEY = '__saagsSentinel';

        // Región accesible para mensajes efímeros
        let live = document.getElementById('saags-live-region');
        if (!live) {
            live = document.createElement('div');
            live.id = 'saags-live-region';
            live.className = 'visually-hidden';
            live.setAttribute('aria-live','polite');
            document.body.appendChild(live);
        }
        function anunciar(msg){
            if (!live) return;
            live.textContent = msg;
        }

        // Reemplazamos el estado actual por un sentinel y añadimos uno extra para capturar la primera pulsación atrás.
        try {
            history.replaceState({ [SENTINEL_KEY]: 0 }, document.title, location.href);
            history.pushState({ [SENTINEL_KEY]: 1 }, document.title, location.href);
        } catch(_){ return; }

        window.addEventListener('popstate', function(e){
            if (!activo) return; // ya liberado
            if (!e.state || e.state[SENTINEL_KEY] === undefined) return; // no es nuestro sentinel, permitir salida
            const ahora = Date.now();
            if (ahora - ultimaPulsacion < EXIT_WINDOW_MS) {
                // Segunda pulsación rápida: liberar y ejecutar un back real para salir.
                activo = false;
                anunciar('Saliendo del sitio');
                // Pequeño timeout para asegurar que el usuario vea el anuncio (opcional)
                setTimeout(() => { history.back(); }, 40);
            } else {
                // Primera pulsación: reinsertamos un sentinel para seguir dentro y avisamos.
                ultimaPulsacion = ahora;
                anunciar('Pulsa atrás de nuevo para salir');
                try { history.pushState({ [SENTINEL_KEY]: 1 }, document.title, location.href); } catch(_) {}
            }
        });
    })();
    });
});