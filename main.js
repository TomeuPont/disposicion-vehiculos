// ========== Configuración Firebase ==========
const firebaseConfig = {
  // ... tus datos de configuración ...
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ========== Variables ==========
let bloques = [];      // Array de objetos bloque
let bloqueActual = {}; // Referencia al bloque en edición
let ubicacion = 'taller'; // 'taller' o 'campa'
let modoEdicion = false;

// ========== Funciones utilitarias ==========

function cargarBloques() {
  // Cargar los bloques desde Firebase según la ubicación actual
  db.collection(ubicacion).get().then((querySnapshot) => {
    bloques = [];
    querySnapshot.forEach((doc) => {
      const bloque = doc.data();
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

    // === Nueva lógica para color terminado ===
    if (bloque.terminado) {
      bloqueDiv.classList.add('terminado');
    }

    // Posición y tamaño
    bloqueDiv.style.left = (bloque.x || 0) + '%';
    bloqueDiv.style.top = (bloque.y || 0) + '%';
    if (bloque.width) bloqueDiv.style.width = bloque.width;
    if (bloque.height) bloqueDiv.style.height = bloque.height;

    // Contenido del bloque
    bloqueDiv.innerHTML = `
      <strong>${bloque.actividad || ''}</strong>
      <span>${bloque.matricula || ''}</span>
      <span>${bloque.marca || ''}</span>
      <span>${bloque.cliente || ''}</span>
    `;

    // Click para editar
    bloqueDiv.onclick = () => abrirModal(bloque);

    plano.appendChild(bloqueDiv);
  });
}

function abrirModal(bloque) {
  bloqueActual = {...bloque}; // Copia para edición
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

// ========== Guardar datos del modal ==========
function guardarDatos() {
  // Recoge los datos del formulario del modal
  const actividad = document.getElementById('actividad').value;
  const matricula = document.getElementById('matricula').value;
  const marca = document.getElementById('marca').value;
  const cliente = document.getElementById('cliente').value;
  const trabajador = document.getElementById('trabajador').value;
  const terminado = document.getElementById('terminado').checked;

  // Actualiza bloqueActual
  bloqueActual.actividad = actividad;
  bloqueActual.matricula = matricula;
  bloqueActual.marca = marca;
  bloqueActual.cliente = cliente;
  bloqueActual.trabajador = trabajador;
  bloqueActual.terminado = terminado;

  // Busca el índice en el array bloques
  const idx = bloques.findIndex(b => b.id === bloqueActual.id);
  if (idx !== -1) {
    bloques[idx] = {...bloqueActual};
  }

  // Actualiza en Firebase
  db.collection(ubicacion).doc(bloqueActual.id).set(bloqueActual)
    .then(() => {
      // Actualiza visual
      renderizarBloques();
      cerrarModal();
      mostrarMensaje('Bloque actualizado');
    });
}

// ========== Otras funciones necesarias ==========

function liberarDatos() {
  if (!bloqueActual.id) return;
  db.collection(ubicacion).doc(bloqueActual.id).delete()
    .then(() => {
      cargarBloques();
      cerrarModal();
      mostrarMensaje('Bloque liberado');
    });
}

function mostrarMensaje(msg) {
  const msgDiv = document.getElementById('mensajeEstado');
  msgDiv.innerText = msg;
  msgDiv.style.display = 'block';
  setTimeout(() => msgDiv.style.display = 'none', 2000);
}

// ========== Eventos y utilidades varias ==========

document.getElementById('closeModal').onclick = cerrarModal;

// Botón para alternar entre taller y campa
function alternarUbicacion() {
  ubicacion = (ubicacion === 'taller') ? 'campa' : 'taller';
  document.getElementById('btnUbicacion').innerText = (ubicacion === 'taller') ? 'Campa' : 'Taller';
  cargarBloques();
}

window.onload = () => {
  cargarBloques();
};

// ...aquí van el resto de utilidades: modo edición, resetear, mover bloques, etc...

