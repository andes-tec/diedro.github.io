// ================= CONFIGURACIÓN: URLs de Google Sheets (publicadas como CSV) =================
const PROFESIONALES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTx3AHpmzmLegZxB6Cr_gY9iD3D_LGBHO2GK2MIBdS4Ts1makgdpX9LwzNDLMeG0CoiGUCCZNdP6d-t/pub?gid=0&single=true&output=csv";
const PRECIOS_CSV_URL      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTx3AHpmzmLegZxB6Cr_gY9iD3D_LGBHO2GK2MIBdS4Ts1makgdpX9LwzNDLMeG0CoiGUCCZNdP6d-t/pub?gid=798155947&single=true&output=csv";
const JORNALES_CSV_URL     = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTx3AHpmzmLegZxB6Cr_gY9iD3D_LGBHO2GK2MIBdS4Ts1makgdpX9LwzNDLMeG0CoiGUCCZNdP6d-t/pub?gid=1835644096&single=true&output=csv";

// ================= VARIABLES GLOBALES =================
let profesionalesData = [];
let preciosData = [];
let jornalesData = [];
let presupuestoItems = [];

// ================= FUNCIONES PARA CARGAR CSV =================
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

async function cargarProfesionales() {
    const datos = await cargarCSV(PROFESIONALES_CSV_URL);
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
    const datos = await cargarCSV(PRECIOS_CSV_URL);
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
    const datos = await cargarCSV(JORNALES_CSV_URL);
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
        { id: "3", nombre: "Roberto Sánchez", oficio: "Electricista", descripcion: "Instalaciones eléctricas.", estrellas: 4, puntos: 280, zona: "Nuñez", whatsapp: "5491134567890", imagen: "https://randomuser.me/api/portraits/men/3.jpg", estado: "destacado" }
    ];
}

function getDefaultPrecios() {
    return [
        { id: "1", categoria: "Albañilería", tarea: "Muro ladrillo hueco", unidad: "m²", precioUocra: 5200, precioDiedro: 7800 },
        { id: "2", categoria: "Albañilería", tarea: "Revoque grueso", unidad: "m²", precioUocra: 3100, precioDiedro: 4500 },
        { id: "3", categoria: "Electricidad", tarea: "Toma corriente", unidad: "punto", precioUocra: 3500, precioDiedro: 5200 }
    ];
}

function getDefaultJornales() {
    return [
        { categoria: "Oficial Especializado", nivel: "Categoría A", descripcion: "Albañil especializado", jornalUocra: 38500, jornalDiedro: 52000 },
        { categoria: "Oficial", nivel: "Categoría B", descripcion: "Albañil con experiencia", jornalUocra: 34800, jornalDiedro: 47000 },
        { categoria: "Medio Oficial", nivel: "Categoría C", descripcion: "Ayudante especializado", jornalUocra: 31200, jornalDiedro: 42000 }
    ];
}

// ================= FUNCIONES DE RENDERIZADO (adaptadas a datos dinámicos) =================
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
    html += `</tbody></tr>`;
    container.innerHTML = html;
}

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
            return `
                <div class="profile-card-compact" data-id="${prof.id}">
                    <img src="${prof.imagen}" alt="${prof.nombre}" class="compact-avatar" onerror="this.src='https://via.placeholder.com/50?text=?'">
                    <div class="compact-info">
                        <h4>${prof.nombre}</h4>
                        <div class="compact-oficio"><i class="${oficioIcono}"></i> ${prof.oficio}</div>
                        <div class="compact-zona"><i class="fas fa-map-marker-alt"></i> ${prof.zona}</div>
                    </div>
                    <div class="compact-puntos">${prof.puntos} pts</div>
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
            return `<div class="profile-card"><div class="profile-header"><div class="profile-image"><img src="${prof.imagen}" alt="${prof.nombre}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'image-placeholder\'><i class=\'${oficioIcono}\'></i></div>';"></div><div class="profile-info-header"><h3><i class="fas fa-user-check"></i> ${prof.nombre}</h3><div class="puntos-highlight">${prof.puntos} pts</div></div></div><div class="oficio-tag"><i class="${oficioIcono}"></i> ${prof.oficio}</div><div class="zona-info"><i class="fas fa-map-marker-alt"></i> ${prof.zona}</div><div class="descripcion-text">${prof.descripcion}</div><div class="estrellas-container">${estrellasHtml} (${prof.estrellas}/5)</div><div class="nivel-puntos">${nivelTexto}</div><a href="https://wa.me/${prof.whatsapp}?text=Hola%20${encodeURIComponent(prof.nombre)}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i> Contactar</a></div>`;
        }).join("");
    }
}

function abrirModal(prof) {
    const modal = document.getElementById("profesionalModal");
    const modalBody = document.getElementById("modalBody");
    let estrellasHtml = ""; for (let i=1;i<=5;i++) estrellasHtml += i<=prof.estrellas ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    let nivelTexto = "";
    if (prof.estado === "premium") nivelTexto = "🏆 PREMIUM";
    else if (prof.estado === "destacado") nivelTexto = "⭐ DESTACADO";
    else if (prof.estado === "confiable") nivelTexto = "📈 CONFIABLE";
    else nivelTexto = "🆕 EN CRECIMIENTO";
    let oficioIcono = { "Albañil":"fas fa-hard-hat", "Arquitecto":"fas fa-drafting-compass", "Arquitecta":"fas fa-drafting-compass", "Electricista":"fas fa-bolt", "Ingeniero":"fas fa-calculator", "Plomero":"fas fa-wrench", "Pintor":"fas fa-paint-roller", "Yesero":"fas fa-gripfire", "Soldador":"fas fa-fire", "Contratista":"fas fa-handshake", "Ayudante":"fas fa-user-friends", "Canaletero":"fas fa-water", "Durlero":"fas fa-couch" }[prof.oficio] || "fas fa-user";
    modalBody.innerHTML = `
        <div class="modal-profile-header">
            <div class="modal-profile-image"><img src="${prof.imagen}" alt="${prof.nombre}" onerror="this.src='https://via.placeholder.com/80?text=?'"></div>
            <div class="modal-profile-info">
                <h3><i class="fas fa-user-check"></i> ${prof.nombre}</h3>
                <div class="modal-oficio"><i class="${oficioIcono}"></i> ${prof.oficio}</div>
                <div class="modal-puntos"><i class="fas fa-coins"></i> ${prof.puntos} puntos - ${nivelTexto}</div>
            </div>
        </div>
        <div class="modal-zona"><i class="fas fa-map-marker-alt"></i> ${prof.zona}</div>
        <div class="modal-descripcion">${prof.descripcion}</div>
        <div class="modal-estrellas">${estrellasHtml} (${prof.estrellas}/5)</div>
        <a href="https://wa.me/${prof.whatsapp}?text=Hola%20${encodeURIComponent(prof.nombre)}%2C%20vi%20tu%20perfil%20en%20Diedro" target="_blank" class="modal-whatsapp"><i class="fab fa-whatsapp"></i> Contactar por WhatsApp</a>
    `;
    modal.style.display = "block";
}

function cerrarModal() {
    document.getElementById("profesionalModal").style.display = "none";
}

function renderizarTopProfesionales() {
    const container = document.getElementById("topProfesionalesContainer");
    if (!container) return;
    const top = [...profesionalesData].sort((a,b) => b.puntos - a.puntos).slice(0,3);
    if (!top.length) { container.innerHTML = "<div class='loading-spinner'>No hay profesionales</div>"; return; }
    container.innerHTML = top.map(prof => {
        let estrellasHtml = ""; for (let i=1;i<=5;i++) estrellasHtml += i<=prof.estrellas ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        return `<div class="top-card"><div class="top-card-header"><img src="${prof.imagen}" alt="${prof.nombre}" class="top-avatar" onerror="this.src='https://via.placeholder.com/55?text=?'"><div class="top-info"><h4>${prof.nombre}</h4><span class="top-oficio">${prof.oficio}</span></div></div><div class="top-puntos"><i class="fas fa-coins"></i> ${prof.puntos} puntos</div><div class="top-estrellas">${estrellasHtml}</div><a href="https://wa.me/${prof.whatsapp}?text=Hola%20${encodeURIComponent(prof.nombre)}%2C%20vi%20tu%20perfil%20en%20Diedro" target="_blank" class="btn-top-wa"><i class="fab fa-whatsapp"></i> Contactar</a></div>`;
    }).join("");
}

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
    document.querySelector('.tab-btn[data-tab="cotizador"]').click();
    alert(`Se agregó al presupuesto: ${item.tarea} por $${(diedroDiario*dias).toLocaleString('es-AR')}`);
}

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

// ================= EVENTOS Y TABS =================
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
    document.getElementById("heroCotizarBtn")?.addEventListener('click', () => document.querySelector('.tab-btn[data-tab="cotizador"]').click());
    document.getElementById("heroDirectorioBtn")?.addEventListener('click', () => document.querySelector('.tab-btn[data-tab="directorio"]').click());
    
    // BOTÓN WHATSAPP DEL HEADER - REDIRECCIÓN DIRECTA
    document.getElementById("contactoProfesionalBtn")?.addEventListener('click', (e) => {
        e.preventDefault();
        const numero = "5493875048697";
        const mensaje = "Hola, quiero más información para aparecer en el directorio Diedro";
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank");
    });
    
    // ========== PDF PROFESIONAL - CONVENIO ==========
    document.getElementById("descargaPDFConvenio")?.addEventListener('click', (e) => {
        e.preventDefault();
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
    });
    
    document.getElementById("agregarSeleccionadas")?.addEventListener("click", () => {
        const checks = document.querySelectorAll(".check-tarea:checked");
        if (!checks.length) { alert("Seleccioná al menos una tarea."); return; }
        checks.forEach(ch => {
            const tareaObj = JSON.parse(ch.dataset.tarea);
            let cantidad = parseFloat(prompt(`Cantidad para ${tareaObj.tarea}:`, "1"));
            if (!isNaN(cantidad) && cantidad>0) {
                const existe = presupuestoItems.find(i => i.id === tareaObj.id);
                if(existe) existe.cantidad += cantidad;
                else presupuestoItems.push({ ...tareaObj, cantidad });
            }
        });
        actualizarListaPresupuesto();
        document.querySelectorAll(".check-tarea:checked").forEach(ch => ch.checked = false);
    });
    document.getElementById("buscarTareaCotizar")?.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll(".tarea-item").forEach(item => item.style.display = item.innerText.toLowerCase().includes(term) ? "flex" : "none");
    });
    
    // PDF DE PRESUPUESTO MEJORADO
    document.getElementById("generarPDFBtn")?.addEventListener("click", async () => {
        if (!presupuestoItems.length) { alert("Agregá items al presupuesto."); return; }
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
    });
    
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
    document.getElementById("verDirectorioLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelector('.tab-btn[data-tab="directorio"]').click();
    });
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
}

// ================= INICIALIZACIÓN PRINCIPAL =================
async function inicializar() {
    document.getElementById("topProfesionalesContainer").innerHTML = '<div class="loading-spinner">Cargando profesionales...</div>';
    document.getElementById("directorioContainer").innerHTML = '<div class="loading-spinner">Cargando directorio...</div>';
    document.getElementById("tablaPreciosContainer").innerHTML = '<div class="loading-spinner">Cargando precios...</div>';
    document.getElementById("tablaJornalesContainer").innerHTML = '<div class="loading-spinner">Cargando jornales...</div>';
    
    const [prof, prec, jor] = await Promise.all([cargarProfesionales(), cargarPrecios(), cargarJornales()]);
    profesionalesData = prof;
    preciosData = prec;
    jornalesData = jor;
    
    renderizarTablaPrecios();
    renderizarTablaJornales();
    renderizarDirectorioCompleto();
    renderizarTopProfesionales();
    cargarCategoriasCalculadora();
    actualizarCalculo();
    initTabs();
}

document.addEventListener("DOMContentLoaded", inicializar);