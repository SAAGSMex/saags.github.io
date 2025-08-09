// Javascript personalizado para mejorar la navegación y la experiencia del usuario

// Script Personalizado
document.addEventListener('DOMContentLoaded', function() {
    // 1. Animación del botón "Nuestras actividades"
    const btnActividades = document.getElementById('btn-actividades');
    if (btnActividades) {
        btnActividades.addEventListener('animationend', function(e) {
            if (e.animationName === 'fadeInUp') {
                btnActividades.classList.remove('animate__fadeInUp');
                btnActividades.classList.add('animate__pulse', 'animate__infinite');
            }
        }, { once: true });
    }

    // 2. LÓGICA PARA CERRAR NAVBAR (SIN INTERFERIR EN NAVEGACIÓN)
    // Seleccionamos TODOS los enlaces dentro del menú desplegable
    const navLinksInMenu = document.querySelectorAll('#navbarNav .nav-link');
    const navbarCollapse = document.getElementById('navbarNav');
    const bsCollapse = navbarCollapse ? new bootstrap.Collapse(navbarCollapse, { toggle: false }) : null;

    navLinksInMenu.forEach(link => {
        link.addEventListener('click', () => {
            // NO hay e.preventDefault(). Dejamos que el enlace funcione 100% nativo.
            // Si el menú está abierto, lo cerramos.
            if (bsCollapse && navbarCollapse.classList.contains('show')) {
                bsCollapse.hide();
            }
        });
    });

    // 3. RESALTADO ACTIVO EFICIENTE CON INTERSECTION OBSERVER
    const sections = document.querySelectorAll('section[id]');
    const navLinksForObserver = document.querySelectorAll('.navbar-nav .nav-link');

    // Opciones del observador corregidas para una mejor experiencia de usuario
    const observerOptions = {
        root: null,
        // El margen superior es -76px (la altura del navbar) para que la sección se active justo cuando pasa por debajo de la barra.
        // El margen inferior es -40% para evitar que se activen dos enlaces a la vez si una sección es muy alta.
        rootMargin: '-76px 0px -40% 0px',
        threshold: 0
    };

    // ESTA ES LA ÚNICA DECLARACIÓN QUE DEBE EXISTIR
    const sectionObserver = new IntersectionObserver((entries) => {
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
    }, observerOptions);

    sections.forEach(section => {
        if (section.id) sectionObserver.observe(section);
    });

    // 4. GESTIÓN AVANZADA DE ENLACES (CON CLEANUP)
    document.querySelectorAll('a[href]').forEach(link => {
        // CASO 1: Es un botón de una tarjeta de actividad
        if (link.matches('#actividades .card-footer .btn')) {
            const handleClick = (e) => {
                // 1. Prevenimos la navegación para controlarla
                e.preventDefault();
                // 2. Guardamos el destino
                const destination = link.href;
                // 3. Añadimos el feedback visual
                link.classList.add('btn-touched');
                // 4. Quitamos el foco para evitar sticky :focus
                link.blur();
                // 5. Después de un retardo, hacemos DOS cosas:
                //    - Abrimos el enlace.
                //    - Limpiamos la clase para que el botón esté normal al regresar.
                setTimeout(() => {
                    // Abre el enlace en una nueva pestaña
                    window.open(destination, '_blank', 'noopener,noreferrer');
                    // ¡LA PIEZA FALTANTE! Elimina la clase del efecto visual.
                    link.classList.remove('btn-touched');
                }, 300); // 300ms de feedback visual.
            };
            link.addEventListener('click', handleClick);
        // CASO 2: Es CUALQUIER OTRO enlace externo (que no sea un botón de actividad)
        } else if (/^https?:\/\//.test(link.href) && link.hostname !== window.location.hostname) {
            // A estos solo les ponemos el target="_blank"
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });

    // 5. INICIALIZACIÓN DE GLIGHTBOX
    if (typeof GLightbox === 'function') {
        GLightbox({
            selector: '.glightbox',
            touchNavigation: true,
            loop: true,
            closeButton: true
        });
    }

    // --- FUNCIONALIDAD PARA EL BOTÓN "VER MÁS FOTOGRAFÍAS" Y "VER MENOS FOTOGRAFÍAS" ---
    const btnVerMas = document.getElementById('btn-ver-mas');
    const btnVerMenos = document.getElementById('btn-ver-menos');
    const galeriaOculta = document.getElementById('galeria-oculta');

    if (btnVerMas && btnVerMenos && galeriaOculta) {
        // Almacenamos la instancia de GLightbox para poder recargarla.
        let lightbox = GLightbox({
            selector: '.glightbox'
        });

        // Funcionalidad para el botón "Ver más"
        btnVerMas.addEventListener('click', function(e) {
            // 1. Prevenimos que el enlace '#' salte la página
            e.preventDefault();
            // 2. Mostramos la galería oculta quitando la clase 'd-none'
            galeriaOculta.classList.remove('d-none');
            // 3. Ocultamos el botón "Ver más" para que no se pueda volver a hacer clic
            btnVerMas.style.display = 'none';
            // 4. Mostramos el botón "Ver menos"
            btnVerMenos.classList.remove('d-none');
            // 5. Recargamos la instancia de GLightbox para que encuentre las nuevas imágenes
            lightbox.reload();
        });

        // Funcionalidad para el botón "Ver menos"
        btnVerMenos.addEventListener('click', function(e) {
            // 1. Prevenimos que el enlace '#' salte la página
            e.preventDefault();
            // 2. Ocultamos nuevamente la galería añadiendo la clase 'd-none'
            galeriaOculta.classList.add('d-none');
            // 3. Ocultamos el botón "Ver menos"
            btnVerMenos.classList.add('d-none');
            // 4. Mostramos el botón "Ver más"
            btnVerMas.style.display = 'inline-block';
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

            if (!nombre.value.trim()) {
                mostrarMensajeError(nombre, "El nombre es obligatorio.");
                valido = false;
            }
            if (!email.value.trim() || !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email.value)) {
                mostrarMensajeError(email, "Introduce un correo electrónico válido.");
                valido = false;
            }
            if (!asunto.value.trim()) {
                mostrarMensajeError(asunto, "El asunto es obligatorio.");
                valido = false;
            }
            if (!mensaje.value.trim()) {
                mostrarMensajeError(mensaje, "El mensaje es obligatorio.");
                valido = false;
            }

            if (valido) {
                contactoForm.reset();
                mostrarMensajeExito(contactoForm, "¡Mensaje enviado con éxito! (demostración)");
            }
        });
    }

    // Boletín Informativo (footer)
    const newsletterForm = document.querySelector('.footer form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevenimos el envío real
            newsletterForm.querySelectorAll('.mensaje-error').forEach(el => el.remove());
            const newsletterInput = newsletterForm.querySelector('input[type="email"]');
            if (!newsletterInput.value.trim() || !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(newsletterInput.value)) {
                mostrarMensajeError(newsletterInput, "Introduce un correo electrónico válido.");
                return;
            }
            newsletterInput.value = '';
            mostrarMensajeExito(newsletterForm.querySelector('.input-group'), "¡Te has suscrito con éxito!");
        });
    }
});