// ========================
// CONFIGURACIÓN FIREBASE
// ========================
const firebaseConfig = {
  // Pon aquí tus datos de configuración
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ========================
// VARIABLES GLOBALES
// ========================
let bloques = [];
let bloqueActual = null;
let ubicacion = 'taller'; // 'taller' o 'campa'
let modoEdicion = false;
let arrastrando = null;
let offsetX = 0, offsetY = 0;

// ========================
// CARGA INICIAL
// ========================
window.onload = () => {
  cargarBloques();
  document.getElementById('closeModal').onclick = cerrarModal;
  document.getElementById('btnUbicacion').onclick = alternarUbicacion;
  document.getElementById('botonConfiguracion').onclick = mostrarConfiguracion;
  document.addEventListener('mousedown', iniciarArrastre);
  document.addEventListener('mousemove', moverArrastre);
  document.addEventListener('mouseup', terminarArrastre);
};

// ========================
// RENDERIZADO DE BLOQUES
// ========================
function cargarBloques() {
  db.collection(ubicacion).get().then((querySnapshot) => {
    bloques = [];
    querySnapshot.forEach((doc) => {
      let bloque = doc.data();
      bloque.id = doc.id;
      bloques.push(bloque);
    });
    renderizarBloques();
  });
}

function renderizarBloques() {
  const plano = document.getElementById('plano');
  plano.innerHTML = '';
  bloques.forEach(bloque => {
    const bloqueDiv = document.createElement('div');
    bloqueDiv.className = 'bloque';
    bloqueDiv.id = 'bloque-' + bloque.id;

    // Posición y tamaño relativos
    bloqueDiv.style.left = (bloque.x || 0) + '%';
    bloqueDiv.style.top = (bloque.y || 0) + '%';
    if (bloque.width) bloqueDiv.style.width = bloque.width;
    if (bloque.height) bloqueDiv.style.height = bloque.height;

    // Estado terminado: color amarillo
    if (bloque.terminado) {
      bloqueDiv.classList.add('terminado');
    }

    // Contenido
    bloqueDiv.innerHTML = `
      <strong>${bloque.actividad || ''}</strong>
      <span>${bloque.matricula || ''}</span>
      <span>${bloque.marca || ''}</span>
      <span>${bloque.cliente || ''}</span>
    `;

    // Permitir arrastrar si está en modo edición
    if (modoEdicion) {
      bloqueDiv.style.cursor = 'grab';
      bloqueDiv.onmousedown = (e) => {
        if (e.button !== 0) return;
        arrastrando = bloqueDiv;
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        arrastrando.dataset.id = bloque.id;
      };
    } else {
      bloqueDiv.style.cursor = 'pointer';
      bloqueDiv.onmousedown = null;
    }

    // Click para editar solo fuera de modo edición
    bloqueDiv.onclick = (e) => {
      if (!modoEdicion && e.button === 0) abrirModal(bloque);
    };

    plano.appendChild(bloqueDiv);
  });
}

// ========================
// MODAL DE EDICIÓN
// ========================
function abrirModal(bloque) {
  bloqueActual = { ...bloque }; // Copia para edición
  document.getElementById('actividad').value = bloque.actividad || '';
  document.getElementById('matricula').value = bloque.matricula || '';
  document.getElementById('marca').value = bloque.marca || '';
  document.getElementById('cliente').value = bloque.cliente || '';
  document.getElementById('trabajador').value = bloque.trabajador || '';
  document.getElementById('terminado').checked = !!bloque.terminado;
  document.getElementById('modal').style.display = 'flex';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
}

// ========================
// GUARDAR / LIBERAR DATOS
// ========================
function guardarDatos() {
  const actividad = document.getElementById('actividad').value;
  const matricula = document.getElementById('matricula').value;
  const marca = document.getElementById('marca').value;
  const cliente = document.getElementById('cliente').value;
  const trabajador = document.getElementById('trabajador').value;
  const terminado = document.getElementById('terminado').checked;

  bloqueActual.actividad = actividad;
  bloqueActual.matricula = matricula;
  bloqueActual.marca = marca;
  bloqueActual.cliente = cliente;
  bloqueActual.trabajador = trabajador;
  bloqueActual.terminado = terminado;

  db.collection(ubicacion).doc(bloqueActual.id).set(bloqueActual).then(() => {
    mostrarMensaje('Bloque actualizado');
    cargarBloques();
    cerrarModal();
  });
}

function liberarDatos() {
  if (!bloqueActual.id) return;
  db.collection(ubicacion).doc(bloqueActual.id).delete().then(() => {
    mostrarMensaje('Bloque liberado');
    cargarBloques();
    cerrarModal();
  });
}

// ========================
// DRAG & DROP DE BLOQUES
// ========================
function iniciarArrastre(e) {
  if (!modoEdicion || !e.target.classList.contains('bloque')) return;
  arrastrando = e.target;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
  arrastrando.style.zIndex = 2000;
}

function moverArrastre(e) {
  if (!modoEdicion || !arrastrando) return;
  const plano = document.getElementById('plano');
  const rect = plano.getBoundingClientRect();
  let x = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
  let y = ((e.clientY - rect.top - offsetY) / rect.height) * 100;
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));
  arrastrando.style.left = x + '%';
  arrastrando.style.top = y + '%';
}

function terminarArrastre(e) {
  if (!modoEdicion || !arrastrando) return;
  const id = arrastrando.dataset.id;
  const plano = document.getElementById('plano');
  const rect = plano.getBoundingClientRect();
  let x = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
  let y = ((e.clientY - rect.top - offsetY) / rect.height) * 100;
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));
  // Actualiza la posición en Firestore
  db.collection(ubicacion).doc(id).update({ x, y }).then(() => {
    cargarBloques();
  });
  arrastrando.style.zIndex = 1;
  arrastrando = null;
}

// ========================
// MENSAJES DE ESTADO
// ========================
function mostrarMensaje(msg) {
  const msgDiv = document.getElementById('mensajeEstado');
  msgDiv.innerText = msg;
  msgDiv.style.display = 'block';
  setTimeout(() => msgDiv.style.display = 'none', 2000);
}

// ========================
// UBICACIÓN: TALLER / CAMPA
// ========================
function alternarUbicacion() {
  ubicacion = (ubicacion === 'taller') ? 'campa' : 'taller';
  document.getElementById('btnUbicacion').innerText = (ubicacion === 'taller') ? 'Campa' : 'Taller';
  cargarBloques();
}

// ========================
// MODO EDICIÓN
// ========================
function alternarModo() {
  modoEdicion = !modoEdicion;
  document.querySelector('#menuConfiguracion button').innerText = modoEdicion ? 'Desactivar modo edición' : 'Activar modo edición';
  renderizarBloques();
  mostrarMensaje(modoEdicion ? 'Modo edición activado' : 'Modo edición desactivado');
}

// ========================
// RESET DE BLOQUES
// ========================
function confirmarReseteo() {
  const pass = prompt('Introduce la contraseña para resetear (pista: patata)');
  if (pass === 'patata') {
    resetearBloques();
  } else if (pass !== null) {
    mostrarMensaje('Contraseña incorrecta');
  }
}

function resetearBloques() {
  // Puedes personalizar la lógica para moverlos a una esquina y limpiar sus datos
  const promises = bloques.map(bloque => {
    return db.collection(ubicacion).doc(bloque.id).update({
      x: 95, y: 95,
      actividad: '',
      matricula: '',
      marca: '',
      cliente: '',
      trabajador: '',
      terminado: false
    });
  });
  Promise.all(promises).then(() => {
    mostrarMensaje('Todos los bloques reseteados');
    cargarBloques();
  });
}

// ========================
// MENÚ DE CONFIGURACIÓN
// ========================
function mostrarConfiguracion() {
  const menu = document.getElementById('menuConfiguracion');
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
