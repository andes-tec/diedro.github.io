// ================= CONFIGURACIÓN: Proxy Cloudflare Workers =================
const PROXY_URL = "https://diedro-proxy.aquilesdesarrollo.workers.dev"; //  WORKER
const SECRET_API_KEY = "d13dr0S3cr3tK3y2025"; //  CONFIGURACION CLOUDFLARE

// ================= VARIABLES GLOBALES =================
let profesionalesData = [];
let preciosData = [];
let jornalesData = [];
let presupuestoItems = [];
let comentariosCache = {};
let contadorComentarios = {};
let dataLoaded = false; // Flag para saber si los datos principales ya se cargaron
let redireccionIntentada = false; // Evitar redirección en bucle

// ================= SONIDOS (Web Audio API) =================
let audioContext = null;

async function reproducirSonido(tipo) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        if (tipo === 'comentario') {
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
            osc.start();
            osc.stop(now + 0.5);
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
        } else if (tipo === 'agregar') {
            osc.frequency.value = 660;
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
            osc.start();
            osc.stop(now + 0.2);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        }
    } catch (e) {
        console.warn("Error reproduciendo sonido:", e);
    }
}

// ================= FUNCIÓN PARA DETECTAR NAVEGADOR DE FACEBOOK/INSTAGRAM =================
function isFacebookBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /FBAN|FBAV|FBIOS|FBDV|FB_IAB|Instagram|Messenger/i.test(ua);
}

// ================= REDIRECCIÓN AUTOMÁTICA A NAVEGADOR EXTERNO =================
function redirigirANavegadorExterno() {
    // Si ya se intentó redirigir, no repetir
    if (redireccionIntentada) return false;
    
    // Solo actuar si estamos dentro de Facebook/Instagram
    if (!isFacebookBrowser()) return false;
    
    // Evitar redirección si ya hay un parámetro de redirección en la URL (para no loop)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ext') === '1') return false;
    
    redireccionIntentada = true;
    
    // Construir la URL actual con un parámetro que indique que ya se intentó
    const currentUrl = window.location.href;
    const separator = currentUrl.includes('?') ? '&' : '?';
    const targetUrl = currentUrl + separator + 'ext=1';
    
    // Detectar sistema operativo
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isAndroid) {
        // Para Android: usar intent:// para abrir en Chrome
        // Convertir la URL a intent
        const intentUrl = `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end;`;
        window.location.href = intentUrl;
        return true;
    } else if (isIOS) {
        // Para iOS no hay forma automática, mostramos modal con instrucciones
        mostrarModalNavegadorIOS();
        return false; // No redirige automáticamente, pero muestra el modal
    }
    
    return false;
}

function mostrarModalNavegadorIOS() {
    // Si ya existe un modal de este tipo, no duplicar
    if (document.getElementById('modalRedireccionIOS')) return;
    
    const modal = document.createElement('div');
    modal.id = 'modalRedireccionIOS';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(8px);
    `;
    
    const contenido = document.createElement('div');
    contenido.style.cssText = `
        background: white;
        max-width: 90%;
        width: 320px;
        padding: 1.8rem;
        border-radius: 1.5rem;
        text-align: center;
        box-shadow: 0 20px 30px rgba(0,0,0,0.3);
        font-family: system-ui, sans-serif;
    `;
    
    contenido.innerHTML = `
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">📱</div>
        <h3 style="margin:0 0 0.8rem; color:#1a202c;">Abrir en Safari</h3>
        <p style="color:#4a5568; font-size:0.9rem; line-height:1.4;">
            Para descargar los PDFs y usar el cotizador correctamente, necesitás abrir esta página en Safari.
        </p>
        <div style="background:#f3f4f6; border-radius:1rem; padding:0.8rem; margin:1rem 0; text-align:left;">
            <p style="margin:0 0 0.5rem; font-weight:600;">📌 Pasos:</p>
            <p style="margin:0 0 0.3rem;">1. Tocá los tres puntos <strong>⋯</strong> arriba a la derecha.</p>
            <p style="margin:0;">2. Seleccioná <strong>"Abrir en Safari"</strong>.</p>
        </div>
        <button id="btnCerrarIOS" style="background:#fbbf24; color:#1a202c; border:none; padding:10px 20px; border-radius:30px; margin-top:10px; font-weight:bold; width:100%;">Entendido</button>
    `;
    
    modal.appendChild(contenido);
    document.body.appendChild(modal);
    
    const btnCerrar = document.getElementById('btnCerrarIOS');
    btnCerrar.addEventListener('click', () => {
        modal.remove();
    });
}

// ================= TOAST MODERNO =================
function mostrarToast(mensaje) {
    const toastExistente = document.querySelector('.toast-message');
    if (toastExistente) toastExistente.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 2500);
}

// ================= FUNCIONES PARA CARGAR CSV (vía proxy) =================
async function cargarCSV(url) {
    try {
        const response = await fetch(url);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error("Error cargando CSV:", url, error);
        return [];
    }
}

function parseCSV(csv) {
    const lineas = csv.split(/\r?\n/);
    if (lineas.length === 0) return [];
    const encabezados = lineas[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
    const datos = [];
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        let valores = [];
        let dentroComillas = false;
        let valorActual = "";
        for (let j = 0; j < lineas[i].length; j++) {
            const ch = lineas[i][j];
            if (ch === '"') {
                dentroComillas = !dentroComillas;
            } else if (ch === "," && !dentroComillas) {
                valores.push(valorActual.trim().replace(/^"|"$/g, ''));
                valorActual = "";
            } else {
                valorActual += ch;
            }
        }
        valores.push(valorActual.trim().replace(/^"|"$/g, ''));
        
        const objeto = {};
        encabezados.forEach((enc, idx) => {
            let val = valores[idx] || "";
            if (["id", "estrellas", "puntos", "UOCRA", "DIEDRO", "jornalUocra", "jornalDiedro"].includes(enc)) {
                val = parseFloat(val);
                if (isNaN(val)) val = 0;
            }
            objeto[enc] = val;
        });
        datos.push(objeto);
    }
    return datos;
}

// ================= COMENTARIOS (vía proxy) =================
async function cargarComentarios(idProfesional) {
    if (comentariosCache[idProfesional]) return comentariosCache[idProfesional];
    try {
        const response = await fetch(`${PROXY_URL}/api/comentarios`);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        const comentarios = data.filter(c => String(c.id_profesional) === String(idProfesional));
        comentarios.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        comentariosCache[idProfesional] = comentarios;
        return comentarios;
    } catch (error) {
        console.error("Error cargando comentarios", error);
        return [];
    }
}

async function enviarComentario(idProfesional, nombre, comentario) {
    const fecha = new Date().toISOString();
    const data = {
        id_profesional: idProfesional,
        nombre_usuario: nombre.trim() === "" ? "Anónimo" : nombre.trim(),
        comentario: comentario.trim(),
        fecha: fecha
    };
    try {
        const response = await fetch(`${PROXY_URL}/api/enviar-comentario`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": SECRET_API_KEY
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al enviar comentario");
        }
        const result = await response.json();
        if (result.success === false) throw new Error(result.error);
        return {
            id_profesional: idProfesional,
            nombre_usuario: data.nombre_usuario,
            comentario: data.comentario,
            fecha: fecha
        };
    } catch (error) {
        console.error("Error enviando comentario", error);
        alert(error.message);
        return null;
    }
}

function actualizarContadorComentariosEnDirectorio(idProfesional, nuevoTotal) {
    document.querySelectorAll(`.profile-card[data-id="${idProfesional}"] .comentarios-count`).forEach(el => {
        el.textContent = nuevoTotal;
    });
    document.querySelectorAll(`.profile-card-compact[data-id="${idProfesional}"] .compact-comments-count`).forEach(el => {
        el.textContent = nuevoTotal;
    });
    const modalComentarioCount = document.querySelector(`#modalBody .comentarios-total-count`);
    if (modalComentarioCount && modalComentarioCount.dataset.id == idProfesional) {
        modalComentarioCount.textContent = nuevoTotal;
    }
}

// ================= CARGA DE DATOS PRINCIPALES =================
async function cargarProfesionales() {
    const response = await fetch(`${PROXY_URL}/api/profesionales`);
    const csvText = await response.text();
    const datos = parseCSV(csvText);
    if (datos.length === 0) {
        console.warn("No se cargaron profesionales, usando datos por defecto.");
        return getDefaultProfesionales();
    }
    return datos.map(p => ({
        id: String(p.id),
        nombre: p.nombre,
        oficio: p.categoria,
        descripcion: p.descripcion,
        estrellas: p.estrellas,
        puntos: p.puntos,
        zona: p.zona,
        whatsapp: p.numero_contacto,
        imagen: p.foto_perfil,
        estado: p.estado || "confiable"
    }));
}

async function cargarPrecios() {
    const response = await fetch(`${PROXY_URL}/api/precios`);
    const csvText = await response.text();
    const datos = parseCSV(csvText);
    if (datos.length === 0) {
        console.warn("No se cargaron precios, usando datos por defecto.");
        return getDefaultPrecios();
    }
    return datos.map(p => ({
        id: String(p.id),
        categoria: p.categoria,
        tarea: p.tarea,
        unidad: p.unidad,
        precioUocra: p.UOCRA,
        precioDiedro: p.DIEDRO
    }));
}

async function cargarJornales() {
    const response = await fetch(`${PROXY_URL}/api/jornales`);
    const csvText = await response.text();
    const datos = parseCSV(csvText);
    if (datos.length === 0) {
        console.warn("No se cargaron jornales, usando datos por defecto.");
        return getDefaultJornales();
    }
    return datos.map(j => ({
        categoria: j.categoria,
        nivel: j.tiempo,
        descripcion: j.descripcion,
        jornalUocra: j.jornalUocra,
        jornalDiedro: j.jornalDiedro
    }));
}

// ================= DATOS POR DEFECTO (fallback) =================
function getDefaultProfesionales() {
    return [
        { id: "1", nombre: "Juan Pérez", oficio: "Albañil", descripcion: "15 años de experiencia. Refacciones integrales.", estrellas: 5, puntos: 350, zona: "Palermo", whatsapp: "5491112345678", imagen: "https://randomuser.me/api/portraits/men/1.jpg", estado: "premium" },
        { id: "2", nombre: "María González", oficio: "Arquitecta", descripcion: "Diseño y dirección de obra.", estrellas: 5, puntos: 420, zona: "Belgrano", whatsapp: "5491123456789", imagen: "https://randomuser.me/api/portraits/women/2.jpg", estado: "premium" },
        { id: "3", nombre: "Roberto Sánchez", oficio: "Electricista", descripcion: "Instalaciones eléctricas.", estrellas: 4, puntos: 280, zona: "Nuñez", whatsapp: "5491134567890", imagen: "https://randomuser.me/api/portraits/men/3.jpg", estado: "destacado" },
        { id: "4", nombre: "Carlos Gómez", oficio: "Plomero", descripcion: "Reparaciones e instalaciones.", estrellas: 4, puntos: 310, zona: "Caballito", whatsapp: "5491145678901", imagen: "https://randomuser.me/api/portraits/men/4.jpg", estado: "confiable" },
        { id: "5", nombre: "Lucía Fernández", oficio: "Pintora", descripcion: "Pintura interior y exterior.", estrellas: 5, puntos: 390, zona: "San Telmo", whatsapp: "5491156789012", imagen: "https://randomuser.me/api/portraits/women/5.jpg", estado: "premium" },
        { id: "6", nombre: "Diego Morales", oficio: "Soldador", descripcion: "Estructuras metálicas.", estrellas: 4, puntos: 330, zona: "Flores", whatsapp: "5491167890123", imagen: "https://randomuser.me/api/portraits/men/6.jpg", estado: "destacado" },
        { id: "7", nombre: "Laura Díaz", oficio: "Canaletero", descripcion: "Instalación de canaletas.", estrellas: 4, puntos: 290, zona: "Liniers", whatsapp: "5491178901234", imagen: "https://randomuser.me/api/portraits/women/7.jpg", estado: "confiable" },
        { id: "8", nombre: "Fernando López", oficio: "Durlero", descripcion: "Tabiques de durlock.", estrellas: 5, puntos: 410, zona: "Devoto", whatsapp: "5491189012345", imagen: "https://randomuser.me/api/portraits/men/8.jpg", estado: "premium" },
        { id: "9", nombre: "Gabriela Ruiz", oficio: "Contratista", descripcion: "Proyectos integrales.", estrellas: 5, puntos: 450, zona: "Recoleta", whatsapp: "5491190123456", imagen: "https://randomuser.me/api/portraits/women/9.jpg", estado: "premium" },
        { id: "10", nombre: "Martín Acosta", oficio: "Ayudante", descripcion: "Asistente en obra.", estrellas: 3, puntos: 180, zona: "Constitución", whatsapp: "5491201234567", imagen: "https://randomuser.me/api/portraits/men/10.jpg", estado: "crecimiento" }
    ];
}

function getDefaultPrecios() {
    return [
        { id: "1", categoria: "Albañilería", tarea: "Muro ladrillo hueco", unidad: "m²", precioUocra: 5200, precioDiedro: 7800 },
        { id: "2", categoria: "Albañilería", tarea: "Revoque grueso", unidad: "m²", precioUocra: 3100, precioDiedro: 4500 },
        { id: "3", categoria: "Electricidad", tarea: "Toma corriente", unidad: "punto", precioUocra: 3500, precioDiedro: 5200 },
        { id: "4", categoria: "Plomería", tarea: "Instalación de grifería", unidad: "unidad", precioUocra: 2800, precioDiedro: 4200 },
        { id: "5", categoria: "Pintura", tarea: "Pintura látex", unidad: "m²", precioUocra: 1800, precioDiedro: 2700 }
    ];
}

function getDefaultJornales() {
    return [
        { categoria: "Oficial Especializado", nivel: "Categoría A", descripcion: "Albañil especializado", jornalUocra: 38500, jornalDiedro: 52000 },
        { categoria: "Oficial", nivel: "Categoría B", descripcion: "Albañil con experiencia", jornalUocra: 34800, jornalDiedro: 47000 },
        { categoria: "Medio Oficial", nivel: "Categoría C", descripcion: "Ayudante especializado", jornalUocra: 31200, jornalDiedro: 42000 },
        { categoria: "Ayudante", nivel: "Categoría D", descripcion: "Sin experiencia", jornalUocra: 27500, jornalDiedro: 37000 }
    ];
}

// ================= RENDERIZADO DE TABLAS =================
function renderizarTablaPrecios(filtro = "") {
    const container = document.getElementById("tablaPreciosContainer");
    if (!container) return;
    const filtroLower = filtro.toLowerCase();
    const filtered = preciosData.filter(p => p.categoria.toLowerCase().includes(filtroLower) || p.tarea.toLowerCase().includes(filtroLower));
    if (!filtered.length) { container.innerHTML = '<div style="text-align:center; padding:2rem;">No se encontraron resultados</div>'; return; }
    let html = `<table class="precios-table"><thead><tr><th>Categoría</th><th>Tarea</th><th>Unidad</th><th>UOCRA</th><th>Diedro</th></tr></thead><tbody>`;
    filtered.forEach(p => {
        html += `<tr>
            <td data-label="Categoría">${p.categoria}</td>
            <td data-label="Tarea">${p.tarea}</td>
            <td data-label="Unidad">${p.unidad}</td>
            <td data-label="UOCRA">$${p.precioUocra.toLocaleString('es-AR')}</td>
            <td data-label="Diedro" class="diedro-cell">$${p.precioDiedro.toLocaleString('es-AR')}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderizarTablaJornales(filtro = "") {
    const container = document.getElementById("tablaJornalesContainer");
    if (!container) return;
    const filtroLower = filtro.toLowerCase();
    const filtered = jornalesData.filter(j => j.categoria.toLowerCase().includes(filtroLower) || j.nivel.toLowerCase().includes(filtroLower) || j.descripcion.toLowerCase().includes(filtroLower));
    if (!filtered.length) { container.innerHTML = '<div style="text-align:center; padding:2rem;">No se encontraron resultados</div>'; return; }
    let html = `<table class="jornales-table"><thead><tr><th>Categoría</th><th>Nivel</th><th>Descripción</th><th>Jornal UOCRA</th><th>Jornal Diedro</th></tr></thead><tbody>`;
    filtered.forEach(j => {
        html += `<tr>
            <td data-label="Categoría"><span class="categoria-badge">${j.categoria}</span></td>
            <td data-label="Tiempo">${j.nivel}</td>
            <td data-label="Descripción">${j.descripcion}</td>
            <td data-label="UOCRA">$${j.jornalUocra.toLocaleString('es-AR')}</td>
            <td data-label="Diedro" class="diedro-cell">$${j.jornalDiedro.toLocaleString('es-AR')}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ================= DIRECTORIO =================
function renderizarDirectorioCompleto() {
    let oficioFiltro = document.getElementById("filtroOficio")?.value || "";
    let zonaFiltro = document.getElementById("filtroZona")?.value.toLowerCase() || "";
    let filtered = profesionalesData.filter(p => (oficioFiltro === "" || p.oficio === oficioFiltro) && (zonaFiltro === "" || p.zona.toLowerCase().includes(zonaFiltro)));
    filtered.sort((a,b) => (b.puntos - a.puntos) || (b.estrellas - a.estrellas));
    const container = document.getElementById("directorioContainer");
    if (!filtered.length) { container.innerHTML = "<div style='text-align:center; padding:2rem;'>No hay profesionales con esos filtros.</div>"; return; }

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        container.innerHTML = filtered.map(prof => {
            let oficioIcono = { "Albañil":"fas fa-hard-hat", "Arquitecto":"fas fa-drafting-compass", "Arquitecta":"fas fa-drafting-compass", "Electricista":"fas fa-bolt", "Ingeniero":"fas fa-calculator", "Plomero":"fas fa-wrench", "Pintor":"fas fa-paint-roller", "Yesero":"fas fa-gripfire", "Soldador":"fas fa-fire", "Contratista":"fas fa-handshake", "Ayudante":"fas fa-user-friends", "Canaletero":"fas fa-water", "Durlero":"fas fa-couch" }[prof.oficio] || "fas fa-user";
            const cantComentarios = contadorComentarios[prof.id] || 0;
            return `
                <div class="profile-card-compact" data-id="${prof.id}">
                    <img src="${prof.imagen}" alt="${prof.nombre}" class="compact-avatar" onerror="this.src='https://via.placeholder.com/50?text=?'">
                    <div class="compact-info">
                        <h4>${prof.nombre}</h4>
                        <div class="compact-oficio"><i class="${oficioIcono}"></i> ${prof.oficio}</div>
                        <div class="compact-zona"><i class="fas fa-map-marker-alt"></i> ${prof.zona}</div>
                    </div>
                    <div class="compact-stats">
                        <span class="compact-comments"><i class="fas fa-comment"></i> <span class="compact-comments-count">${cantComentarios}</span></span>
                        <span class="compact-points"><i class="fas fa-coins"></i> ${prof.puntos}</span>
                    </div>
                </div>
            `;
        }).join("");
        document.querySelectorAll('.profile-card-compact').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                const profesional = profesionalesData.find(p => p.id == id);
                if (profesional) abrirModal(profesional);
            });
        });
    } else {
        container.innerHTML = filtered.map(prof => {
            let estrellasHtml = ""; for (let i=1;i<=5;i++) estrellasHtml += i<=prof.estrellas ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
            let nivelTexto = "";
            if (prof.estado === "premium") nivelTexto = "🏆 PREMIUM";
            else if (prof.estado === "destacado") nivelTexto = "⭐ DESTACADO";
            else if (prof.estado === "confiable") nivelTexto = "📈 CONFIABLE";
            else nivelTexto = "🆕 EN CRECIMIENTO";
            let oficioIcono = { "Albañil":"fas fa-hard-hat", "Arquitecto":"fas fa-drafting-compass", "Arquitecta":"fas fa-drafting-compass", "Electricista":"fas fa-bolt", "Ingeniero":"fas fa-calculator", "Plomero":"fas fa-wrench", "Pintor":"fas fa-paint-roller", "Yesero":"fas fa-gripfire", "Soldador":"fas fa-fire", "Contratista":"fas fa-handshake", "Ayudante":"fas fa-user-friends", "Canaletero":"fas fa-water", "Durlero":"fas fa-couch" }[prof.oficio] || "fas fa-user";
            const cantComentarios = contadorComentarios[prof.id] || 0;
            return `<div class="profile-card" data-id="${prof.id}">
                        <div class="profile-header">
                            <div class="profile-image"><img src="${prof.imagen}" alt="${prof.nombre}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'image-placeholder\'><i class=\'${oficioIcono}\'></i></div>';"></div>
                            <div class="profile-info-header">
                                <h3><i class="fas fa-user-check"></i> ${prof.nombre}</h3>
                                <div class="puntos-highlight">${prof.puntos} pts</div>
                            </div>
                        </div>
                        <div class="oficio-tag"><i class="${oficioIcono}"></i> ${prof.oficio}</div>
                        <div class="zona-info"><i class="fas fa-map-marker-alt"></i> ${prof.zona}</div>
                        <div class="descripcion-text">${prof.descripcion}</div>
                        <div class="estrellas-container">${estrellasHtml} (${prof.estrellas}/5)</div>
                        <div class="nivel-puntos">${nivelTexto}</div>
                        <div class="comentarios-badge" data-id="${prof.id}"><i class="fas fa-comment"></i> <span class="comentarios-count">${cantComentarios}</span> comentario${cantComentarios !== 1 ? 's' : ''}</div>
                        <a href="https://wa.me/${prof.whatsapp}?text=Hola%20${encodeURIComponent(prof.nombre)}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i> Contactar</a>
                    </div>`;
        }).join("");
        
        document.querySelectorAll('.profile-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.comentarios-badge')) return;
                const id = card.dataset.id;
                const profesional = profesionalesData.find(p => p.id == id);
                if (profesional) abrirModal(profesional);
            });
        });
        
        document.querySelectorAll('.comentarios-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = badge.dataset.id;
                const profesional = profesionalesData.find(p => p.id == id);
                if (profesional) {
                    abrirModal(profesional);
                    setTimeout(() => {
                        const comentariosSection = document.querySelector('#modalBody .comentarios-section');
                        if (comentariosSection) comentariosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            });
        });
    }
}

// ================= MODAL =================
async function abrirModal(prof) {
    const modal = document.getElementById("profesionalModal");
    const modalBody = document.getElementById("modalBody");
    let estrellasHtml = ""; for (let i=1;i<=5;i++) estrellasHtml += i<=prof.estrellas ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    let nivelTexto = "";
    if (prof.estado === "premium") nivelTexto = "🏆 PREMIUM";
    else if (prof.estado === "destacado") nivelTexto = "⭐ DESTACADO";
    else if (prof.estado === "confiable") nivelTexto = "📈 CONFIABLE";
    else nivelTexto = "🆕 EN CRECIMIENTO";
    let oficioIcono = { "Albañil":"fas fa-hard-hat", "Arquitecto":"fas fa-drafting-compass", "Arquitecta":"fas fa-drafting-compass", "Electricista":"fas fa-bolt", "Ingeniero":"fas fa-calculator", "Plomero":"fas fa-wrench", "Pintor":"fas fa-paint-roller", "Yesero":"fas fa-gripfire", "Soldador":"fas fa-fire", "Contratista":"fas fa-handshake", "Ayudante":"fas fa-user-friends", "Canaletero":"fas fa-water", "Durlero":"fas fa-couch" }[prof.oficio] || "fas fa-user";
    
    const comentarios = await cargarComentarios(prof.id);
    const cantidadComentarios = comentarios.length;
    contadorComentarios[prof.id] = cantidadComentarios;
    
    const comentariosHtml = comentarios.map(c => `
        <div class="comentario-item" data-fecha="${c.fecha}">
            <div class="comentario-header">
                <span class="comentario-nombre">${escapeHtml(c.nombre_usuario)}</span>
                <span class="comentario-fecha">${new Date(c.fecha).toLocaleDateString('es-AR')}</span>
            </div>
            <div class="comentario-texto">${escapeHtml(c.comentario)}</div>
        </div>
    `).join("");
    
    modalBody.innerHTML = `
        <div class="modal-profile-header">
            <div class="modal-profile-image"><img src="${prof.imagen}" alt="${prof.nombre}" onerror="this.src='https://via.placeholder.com/80?text=?'"></div>
            <div class="modal-profile-info">
                <h3><i class="fas fa-user-check"></i> ${prof.nombre}</h3>
                <div class="modal-oficio"><i class="${oficioIcono}"></i> ${prof.oficio}</div>
                <div class="modal-badges">
                    <span class="badge-puntos"><i class="fas fa-coins"></i> ${prof.puntos} pts</span>
                    <span class="badge-comentarios"><i class="fas fa-comment"></i> ${cantidadComentarios} comentario${cantidadComentarios !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </div>
        <div class="modal-zona"><i class="fas fa-map-marker-alt"></i> ${prof.zona}</div>
        <div class="modal-descripcion">${prof.descripcion}</div>
        <div class="modal-estrellas">${estrellasHtml} (${prof.estrellas}/5)</div>
        <div class="modal-nivel">${nivelTexto}</div>
        <a href="https://wa.me/${prof.whatsapp}?text=Hola%20${encodeURIComponent(prof.nombre)}%2C%20vi%20tu%20perfil%20en%20Diedro" target="_blank" class="modal-whatsapp"><i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>
        
        <div class="comentarios-section">
            <h4><i class="fas fa-comments"></i> Comentarios de clientes</h4>
            <div class="lista-comentarios" id="listaComentarios_${prof.id}">
                ${comentariosHtml || '<div class="comentario-item">No hay comentarios aún. Sé el primero en opinar.</div>'}
            </div>
            <div class="form-comentario">
                <input type="text" id="comentarioNombre_${prof.id}" placeholder="Tu nombre (opcional)">
                <textarea id="comentarioTexto_${prof.id}" placeholder="Escribe tu comentario..." rows="2"></textarea>
                <button class="btn-enviar-comentario" data-id="${prof.id}"><i class="fas fa-paper-plane"></i> Enviar comentario</button>
            </div>
        </div>
    `;
    
    const btnEnviar = modalBody.querySelector('.btn-enviar-comentario');
    btnEnviar.addEventListener('click', async (e) => {
        const id = btnEnviar.dataset.id;
        const nombreInput = document.getElementById(`comentarioNombre_${id}`);
        const textoInput = document.getElementById(`comentarioTexto_${id}`);
        const nombre = nombreInput.value;
        const texto = textoInput.value;
        if (!texto.trim()) {
            alert("Por favor escribí un comentario.");
            return;
        }
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        const nuevoComentario = await enviarComentario(id, nombre, texto);
        
        if (nuevoComentario) {
            reproducirSonido('comentario');
            
            nombreInput.value = "";
            textoInput.value = "";
            
            if (!comentariosCache[id]) comentariosCache[id] = [];
            comentariosCache[id].unshift(nuevoComentario);
            const nuevaCantidad = comentariosCache[id].length;
            contadorComentarios[id] = nuevaCantidad;
            
            const badgeComentarios = modalBody.querySelector('.badge-comentarios');
            if (badgeComentarios) {
                badgeComentarios.innerHTML = `<i class="fas fa-comment"></i> ${nuevaCantidad} comentario${nuevaCantidad !== 1 ? 's' : ''}`;
            }
            
            actualizarContadorComentariosEnDirectorio(id, nuevaCantidad);
            
            const listaDiv = document.getElementById(`listaComentarios_${id}`);
            const nuevoHtml = `
                <div class="comentario-item" data-fecha="${nuevoComentario.fecha}">
                    <div class="comentario-header">
                        <span class="comentario-nombre">${escapeHtml(nuevoComentario.nombre_usuario)}</span>
                        <span class="comentario-fecha">${new Date(nuevoComentario.fecha).toLocaleDateString('es-AR')}</span>
                    </div>
                    <div class="comentario-texto">${escapeHtml(nuevoComentario.comentario)}</div>
                </div>
            `;
            if (listaDiv.innerHTML.includes("No hay comentarios aún")) {
                listaDiv.innerHTML = nuevoHtml;
            } else {
                listaDiv.insertAdjacentHTML('afterbegin', nuevoHtml);
            }
        } else {
            alert("Error al enviar comentario. Intenta de nuevo más tarde.");
        }
        
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar comentario';
    });
    
    modal.style.display = "block";
    modal.classList.add('dark');
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function cerrarModal() {
    const modal = document.getElementById("profesionalModal");
    modal.style.display = "none";
    modal.classList.remove('dark');
}

// ================= TOP HORIZONTAL =================
function renderizarTopHorizontal() {
    const container = document.getElementById("topProfesionalesHorizontal");
    if (!container) return;
    const top = [...profesionalesData].sort((a,b) => b.puntos - a.puntos).slice(0,10);
    if (!top.length) { container.innerHTML = "<div class='loading-spinner'>No hay profesionales</div>"; return; }
    
    container.innerHTML = top.map(prof => `
        <div class="prof-horizontal-card" data-id="${prof.id}">
            <img src="${prof.imagen}" class="prof-horizontal-img" onerror="this.src='https://via.placeholder.com/70?text=?'">
            <h4>${prof.nombre}</h4>
            <div class="prof-oficio">${prof.oficio}</div>
            <div class="prof-puntos"><i class="fas fa-coins"></i> ${prof.puntos} pts</div>
            <a href="https://wa.me/${prof.whatsapp}?text=Hola%20${encodeURIComponent(prof.nombre)}" target="_blank" class="btn-wa-mini" data-wa="true"><i class="fab fa-whatsapp"></i> Contactar</a>
        </div>
    `).join("");
    
    document.querySelectorAll('.prof-horizontal-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-wa-mini')) return;
            const id = card.dataset.id;
            const profesional = profesionalesData.find(p => p.id == id);
            if (profesional) abrirModal(profesional);
        });
    });
}

// ================= CALCULADORA =================
function cargarCategoriasCalculadora() {
    const select = document.getElementById("calcCategoria");
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar categoría</option>' + jornalesData.map(j => `<option value="${j.categoria}" data-uocra="${j.jornalUocra}" data-diedro="${j.jornalDiedro}">${j.categoria} (${j.nivel})</option>`).join('');
}

function actualizarCalculo() {
    const select = document.getElementById("calcCategoria");
    const dias = parseInt(document.getElementById("calcDias")?.value) || 1;
    const selectedOption = select.options[select.selectedIndex];
    if (!select.value || !selectedOption) {
        document.getElementById("calcResultado").innerHTML = `<div class="result-item"><span>Jornal UOCRA:</span><strong>$0</strong></div><div class="result-item"><span>Jornal Diedro:</span><strong class="diedro-price">$0</strong></div><div class="result-item total"><span>Total por ${dias} día(s):</span><strong>$0</strong></div>`;
        return;
    }
    const uocraDiario = parseFloat(selectedOption.dataset.uocra);
    const diedroDiario = parseFloat(selectedOption.dataset.diedro);
    const totalD = diedroDiario * dias;
    document.getElementById("calcResultado").innerHTML = `
        <div class="result-item"><span>Jornal UOCRA:</span><strong>$${uocraDiario.toLocaleString('es-AR')}</strong></div>
        <div class="result-item"><span>Jornal Diedro:</span><strong class="diedro-price">$${diedroDiario.toLocaleString('es-AR')}</strong></div>
        <div class="result-item total"><span>Total por ${dias} día(s):</span><strong>$${totalD.toLocaleString('es-AR')}</strong></div>`;
}

function aplicarCalculoACotizador() {
    const select = document.getElementById("calcCategoria");
    const dias = parseInt(document.getElementById("calcDias")?.value) || 1;
    if (!select.value) { alert("Seleccioná una categoría primero."); return; }
    const selectedOption = select.options[select.selectedIndex];
    const categoria = select.value;
    const uocraDiario = parseFloat(selectedOption.dataset.uocra);
    const diedroDiario = parseFloat(selectedOption.dataset.diedro);
    const item = {
        id: `jornal_${categoria}`,
        tarea: `Jornal ${categoria} (${dias} día${dias>1?'s':''})`,
        unidad: "jornal",
        precioUocra: uocraDiario,
        precioDiedro: diedroDiario,
        cantidad: dias
    };
    presupuestoItems.push(item);
    actualizarListaPresupuesto();
    reproducirSonido('agregar');
    document.querySelector('.tab-btn[data-tab="cotizador"]').click();
    alert(`Se agregó al presupuesto: ${item.tarea} por $${(diedroDiario*dias).toLocaleString('es-AR')}`);
}

// ================= COTIZADOR =================
function cargarTareasParaCotizar() {
    const container = document.getElementById("listaTareasCheck");
    if (!container) return;
    container.innerHTML = preciosData.map(t => `<div class="tarea-item" onclick="this.querySelector('input').click()"><input type="checkbox" value="${t.id}" data-tarea='${JSON.stringify(t)}' class="check-tarea" onclick="event.stopPropagation()"><label><strong>${t.tarea}</strong> (${t.unidad})<br><span style="font-size:0.7rem;">UOCRA: $${t.precioUocra.toLocaleString('es-AR')} | Diedro: $${t.precioDiedro.toLocaleString('es-AR')}</span></label></div>`).join("");
}

function actualizarListaPresupuesto() {
    const divItems = document.getElementById("itemsPresupuesto");
    const itemCountSpan = document.getElementById("itemCount");
    if (!presupuestoItems.length) { divItems.innerHTML = "<div style='text-align:center; padding:2rem;'><i class='fas fa-shopping-cart'></i><br>Sin items</div>"; if(itemCountSpan) itemCountSpan.innerText = "0"; actualizarTotales(); return; }
    if(itemCountSpan) itemCountSpan.innerText = presupuestoItems.length;
    divItems.innerHTML = presupuestoItems.map((item, idx) => `<div class="presupuesto-item"><div><strong>${item.tarea}</strong><br><small>x${item.cantidad} ${item.unidad}</small></div><div style="text-align:right;"><div style="color:var(--gold-dark);">$${(item.precioDiedro*item.cantidad).toLocaleString('es-AR')}</div><button class="btn-remove-item" data-idx="${idx}"><i class="fas fa-trash-alt"></i></button></div></div>`).join("");
    document.querySelectorAll('.btn-remove-item').forEach(btn => btn.addEventListener('click', (e) => { presupuestoItems.splice(parseInt(btn.dataset.idx),1); actualizarListaPresupuesto(); }));
    actualizarTotales();
}

function actualizarTotales() {
    let totalU=0, totalD=0;
    presupuestoItems.forEach(i => { totalU += i.precioUocra * i.cantidad; totalD += i.precioDiedro * i.cantidad; });
    document.getElementById("totalUocra").innerHTML = `$${totalU.toLocaleString('es-AR')}`;
    document.getElementById("totalDiedro").innerHTML = `$${totalD.toLocaleString('es-AR')}`;
}

// ================= PDF - FUNCIONES MEJORADAS =================

// Guardar solicitud de descarga pendiente (para cuando se está en Facebook/Instagram)
function guardarDescargaPendiente(tipo, datos = null) {
    const key = `diedro_pendiente_${tipo}`;
    const item = {
        tipo: tipo,
        datos: datos,
        timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
    // Limpiar después de 10 minutos por si acaso
    setTimeout(() => {
        if (localStorage.getItem(key)) localStorage.removeItem(key);
    }, 600000);
}

// Procesar descarga pendiente al cargar la página (en el navegador externo)
async function procesarDescargaPendiente() {
    const urlParams = new URLSearchParams(window.location.search);
    const downloadParam = urlParams.get('download');
    if (!downloadParam) return;
    
    // Eliminar el parámetro de la URL sin recargar
    const newUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, document.title, newUrl);
    
    const key = `diedro_pendiente_${downloadParam}`;
    const pendiente = localStorage.getItem(key);
    if (!pendiente) {
        console.warn("No se encontró solicitud pendiente");
        return;
    }
    
    localStorage.removeItem(key);
    const data = JSON.parse(pendiente);
    
    // Esperar a que los datos estén cargados (precios, jornales, etc.)
    if (!dataLoaded) {
        let espera = 0;
        while (!dataLoaded && espera < 100) {
            await new Promise(r => setTimeout(r, 100));
            espera++;
        }
        if (!dataLoaded) {
            mostrarToast("Error: los datos aún no se cargaron. Recargá la página.");
            return;
        }
    }
    
    // Restaurar el presupuesto si es necesario
    if (data.tipo === 'presupuesto' && data.datos && data.datos.items) {
        presupuestoItems = data.datos.items;
        actualizarListaPresupuesto();
    }
    
    // Generar y descargar el PDF directamente
    if (data.tipo === 'convenio') {
        generarPDFConvenio(true);
    } else if (data.tipo === 'presupuesto') {
        generarPDFPresupuesto(true);
    }
}

// Generar PDF de convenio (sin ventana emergente, usando doc.save)
function generarPDFConvenio(forzar = false) {
    if (!forzar && isFacebookBrowser()) {
        guardarDescargaPendiente('convenio', null);
        const url = new URL(window.location.href);
        url.searchParams.set('download', 'convenio');
        // Redirigir a navegador externo (si no se redirigió automáticamente)
        redirigirANavegadorExterno();
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fecha = new Date().toLocaleDateString('es-AR');
    const azulMarino = [25, 55, 85];
    const grisClaro = [245, 245, 250];
    const grisBorde = [200, 200, 210];
    
    doc.setFontSize(22);
    doc.setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setFont("helvetica", "bold");
    doc.text("DIEDRO", 105, 25, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text("Portal de Costos DIEDRO sugerido/ UOCRA + Directorio de Talentos", 105, 33, { align: "center" });
    
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setLineWidth(0.5);
    doc.line(30, 38, 180, 38);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`Documento generado el ${fecha} - Fuente: Relevamiento Diedro y UOCRA`, 105, 46, { align: "center" });
    
    let y = 56;
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(20, y-4, 170, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Jornales por categoría (jornada de 8 horas)", 25, y);
    y += 8;
    const headerY = y;
    doc.setFillColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.rect(20, headerY-4, 170, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Categoría", 22, headerY);
    doc.text("Tiempo", 72, headerY);
    doc.text("Jornal UOCRA", 110, headerY);
    doc.text("Jornal Diedro", 148, headerY);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y = headerY + 5;
    for (const j of jornalesData) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(j.categoria.substring(0, 28), 22, y);
        doc.text(j.nivel.substring(0, 15), 72, y);
        doc.text(`$${j.jornalUocra.toLocaleString('es-AR')}`, 110, y);
        doc.text(`$${j.jornalDiedro.toLocaleString('es-AR')}`, 148, y);
        y += 5;
    }
    y += 6;
    doc.setDrawColor(grisBorde[0], grisBorde[1], grisBorde[2]);
    doc.setLineWidth(0.3);
    doc.line(20, y-2, 190, y-2);
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(20, y+2, 170, 8, 'F');
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.text("Precios por tarea (mano de obra)", 25, y+6);
    y += 14;
    const headerY2 = y;
    doc.setFillColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.rect(20, headerY2-4, 170, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Tarea", 22, headerY2);
    doc.text("Unidad", 92, headerY2);
    doc.text("UOCRA", 122, headerY2);
    doc.text("Diedro", 152, headerY2);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y = headerY2 + 5;
    for (const p of preciosData) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(p.tarea.substring(0, 38), 22, y);
        doc.text(p.unidad, 92, y);
        doc.text(`$${p.precioUocra.toLocaleString('es-AR')}`, 122, y);
        doc.text(`$${p.precioDiedro.toLocaleString('es-AR')}`, 152, y);
        y += 5;
    }
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 285, 190, 285);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text("© 2026 Diedro - Costos actualizados mensualmente. Contacto: info@diedro.com", 105, 292, { align: "center" });
    
    doc.save(`Convenio_UOCRA_Diedro_${fecha.replace(/\//g, '-')}.pdf`);
    mostrarToast("✅ PDF descargado correctamente");
}

function generarPDFPresupuesto(forzar = false) {
    if (!presupuestoItems.length && !forzar) {
        mostrarToast("⚠️ No hay items en el presupuesto");
        return;
    }
    
    if (!forzar && isFacebookBrowser()) {
        const itemsCopy = JSON.parse(JSON.stringify(presupuestoItems));
        guardarDescargaPendiente('presupuesto', { items: itemsCopy });
        const url = new URL(window.location.href);
        url.searchParams.set('download', 'presupuesto');
        redirigirANavegadorExterno();
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fecha = new Date().toLocaleDateString('es-AR');
    const azulMarino = [25, 55, 85];
    doc.setFontSize(22);
    doc.setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setFont("helvetica", "bold");
    doc.text("DIEDRO", 105, 25, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text("Presupuesto de mano de obra", 105, 33, { align: "center" });
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setLineWidth(0.5);
    doc.line(30, 38, 180, 38);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`Generado el ${fecha} - Presupuesto personalizado`, 105, 46, { align: "center" });
    let y = 56;
    doc.setFillColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.rect(20, y-5, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Item", 22, y);
    doc.text("Descripción", 40, y);
    doc.text("Cant.", 110, y);
    doc.text("Precio unit.", 130, y);
    doc.text("Subtotal", 155, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 6;
    let totalGeneral = 0;
    let itemNumber = 1;
    for (const item of presupuestoItems) {
        if (y > 270) { doc.addPage(); y = 20; }
        const subtotal = item.precioDiedro * item.cantidad;
        totalGeneral += subtotal;
        let desc = item.tarea.length > 35 ? item.tarea.substring(0, 32) + "..." : item.tarea;
        doc.text(`${itemNumber}`, 22, y);
        doc.text(desc, 40, y);
        doc.text(`${item.cantidad}`, 112, y);
        doc.text(`$${item.precioDiedro.toLocaleString('es-AR')}`, 132, y);
        doc.text(`$${subtotal.toLocaleString('es-AR')}`, 157, y);
        y += 6;
        itemNumber++;
    }
    y += 4;
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setLineWidth(0.3);
    doc.line(20, y-2, 190, y-2);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.text("Total Sugerido Diedro:", 110, y+4);
    doc.text(`$${totalGeneral.toLocaleString('es-AR')}`, 157, y+4);
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 285, 190, 285);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text("© 2026 Diedro - Presupuesto válido por 30 días. Contacto: info@diedro.com", 105, 292, { align: "center" });
    
    doc.save(`presupuesto_diedro_${fecha.replace(/\//g, '-')}.pdf`);
    mostrarToast("✅ Presupuesto descargado correctamente");
}

// ================= TABS Y MENÚ MÓVIL =================
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabs.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            if(tabId === 'cotizador') cargarTareasParaCotizar();
            if(tabId === 'directorio') renderizarDirectorioCompleto();
            if(tabId === 'precios') renderizarTablaPrecios();
            if(tabId === 'jornales') renderizarTablaJornales();
        });
    });
}

function initMobileMenu() {
    const hamburger = document.getElementById("hamburgerMenu");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileBtns = document.querySelectorAll(".mobile-tab-btn");
    if (hamburger && mobileMenu) {
        hamburger.addEventListener("click", () => {
            mobileMenu.classList.toggle("show");
        });
        mobileBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const tabId = btn.dataset.tab;
                document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
                document.getElementById(tabId).classList.add("active");
                document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
                document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add("active");
                mobileBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                mobileMenu.classList.remove("show");
                if(tabId === 'cotizador') cargarTareasParaCotizar();
                if(tabId === 'directorio') renderizarDirectorioCompleto();
                if(tabId === 'precios') renderizarTablaPrecios();
                if(tabId === 'jornales') renderizarTablaJornales();
            });
        });
    }
}

// ================= EVENTOS GLOBALES =================
function setupEventListeners() {
    document.getElementById("heroCotizarBtn")?.addEventListener('click', () => document.querySelector('.tab-btn[data-tab="cotizador"]').click());
    document.getElementById("heroDirectorioBtn")?.addEventListener('click', () => document.querySelector('.tab-btn[data-tab="directorio"]').click());
    document.getElementById("verDirectorioLinkMovil")?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.tab-btn[data-tab="directorio"]').click();
    });
    
    document.getElementById("contactoProfesionalBtn")?.addEventListener('click', (e) => {
        e.preventDefault();
        const numero = "5493875048697";
        const mensaje = "Hola, quiero más información para aparecer en el directorio Diedro";
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank");
    });
    
    const pdfBtn = document.getElementById('descargaPDFConvenioHero');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', (e) => {
            e.preventDefault();
            generarPDFConvenio();
        });
    }
    
    document.getElementById("agregarSeleccionadas")?.addEventListener("click", () => {
        const checks = document.querySelectorAll(".check-tarea:checked");
        if (!checks.length) {
            mostrarToast("⚠️ Seleccioná al menos una tarea");
            return;
        }
        let itemsAgregados = 0;
        checks.forEach(ch => {
            const tareaObj = JSON.parse(ch.dataset.tarea);
            let cantidad = parseFloat(prompt(`Cantidad para ${tareaObj.tarea}:`, "1"));
            if (!isNaN(cantidad) && cantidad > 0) {
                const existe = presupuestoItems.find(i => i.id === tareaObj.id);
                if (existe) existe.cantidad += cantidad;
                else presupuestoItems.push({ ...tareaObj, cantidad });
                itemsAgregados++;
            }
        });
        if (itemsAgregados > 0) {
            actualizarListaPresupuesto();
            reproducirSonido('agregar');
            mostrarToast(`✅ ${itemsAgregados} tarea(s) agregada(s) al presupuesto`);
            if (window.innerWidth <= 768) {
                document.querySelector('.presupuesto-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        document.querySelectorAll(".check-tarea:checked").forEach(ch => ch.checked = false);
    });
    
    document.getElementById("buscarTareaCotizar")?.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll(".tarea-item").forEach(item => item.style.display = item.innerText.toLowerCase().includes(term) ? "flex" : "none");
    });
    
    document.getElementById("generarPDFBtn")?.addEventListener("click", () => generarPDFPresupuesto());
    
    document.getElementById("searchPrecios")?.addEventListener("input", e => renderizarTablaPrecios(e.target.value));
    document.getElementById("searchJornales")?.addEventListener("input", e => renderizarTablaJornales(e.target.value));
    document.getElementById("filtroOficio")?.addEventListener("change", renderizarDirectorioCompleto);
    document.getElementById("filtroZona")?.addEventListener("input", renderizarDirectorioCompleto);
    document.getElementById("resetFiltros")?.addEventListener("click", () => {
        document.getElementById("filtroOficio").value = "";
        document.getElementById("filtroZona").value = "";
        renderizarDirectorioCompleto();
    });
    
    document.getElementById("calcDias")?.addEventListener("input", actualizarCalculo);
    document.getElementById("calcCategoria")?.addEventListener("change", actualizarCalculo);
    document.getElementById("aplicarCalculoBtn")?.addEventListener("click", aplicarCalculoACotizador);
    
    document.querySelector('.modal-close')?.addEventListener('click', cerrarModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById("profesionalModal");
        if (e.target === modal) cerrarModal();
    });
    
    window.addEventListener('resize', () => {
        clearTimeout(window.resizingTimeout);
        window.resizingTimeout = setTimeout(() => {
            if (document.querySelector('.tab-btn.active')?.dataset.tab === 'directorio') renderizarDirectorioCompleto();
        }, 250);
    });

    const logoArea = document.getElementById('logoArea');
    if (logoArea) {
        logoArea.addEventListener('click', () => {
            const inicioTab = document.querySelector('.tab-btn[data-tab="inicio"]');
            const mobileInicioBtn = document.querySelector('.mobile-tab-btn[data-tab="inicio"]');
            if (inicioTab) inicioTab.click();
            if (mobileInicioBtn) mobileInicioBtn.click();
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) mobileMenu.classList.remove('show');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ================= INICIALIZACIÓN =================
async function inicializar() {
    // Intentar redirigir a navegador externo inmediatamente (solo si es FB/IG y no se ha redirigido ya)
    redirigirANavegadorExterno();
    
    document.getElementById("topProfesionalesHorizontal").innerHTML = '<div class="loading-spinner">Cargando profesionales...</div>';
    document.getElementById("directorioContainer").innerHTML = '<div class="loading-spinner">Cargando directorio...</div>';
    document.getElementById("tablaPreciosContainer").innerHTML = '<div class="loading-spinner">Cargando precios...</div>';
    document.getElementById("tablaJornalesContainer").innerHTML = '<div class="loading-spinner">Cargando jornales...</div>';
    
    const [prof, prec, jor] = await Promise.all([cargarProfesionales(), cargarPrecios(), cargarJornales()]);
    profesionalesData = prof;
    preciosData = prec;
    jornalesData = jor;
    
    const responseComments = await fetch(`${PROXY_URL}/api/comentarios`);
    const csvComments = await responseComments.text();
    const todosComentarios = parseCSV(csvComments);
    contadorComentarios = {};
    for (const coment of todosComentarios) {
        const id = String(coment.id_profesional);
        contadorComentarios[id] = (contadorComentarios[id] || 0) + 1;
    }
    for (const id in contadorComentarios) {
        if (!comentariosCache[id]) {
            comentariosCache[id] = todosComentarios.filter(c => String(c.id_profesional) === id);
        }
    }
    
    renderizarTopHorizontal();
    renderizarTablaPrecios();
    renderizarTablaJornales();
    renderizarDirectorioCompleto();
    cargarCategoriasCalculadora();
    actualizarCalculo();
    initTabs();
    initMobileMenu();
    setupEventListeners();
    
    dataLoaded = true;
    
    // Procesar descarga pendiente (si venimos de una redirección)
    await procesarDescargaPendiente();
}

document.addEventListener("DOMContentLoaded", inicializar);
