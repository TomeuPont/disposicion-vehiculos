// main.js adaptado: todas las posiciones de los bloques son relativas al tamaño del plano

// ------------- CONFIGURACIÓN FIREBASE Y VARIABLES GLOBALES -------------

const firebaseConfig = {
  // Tu configuración (mantén la que ya tienes)
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let modoEdicion = false;
let ubicacionActual = 'taller'; // 'taller' o 'campa'
let bloques = [];
let trabajadores = [];
let bloqueSeleccionado = null;

// ------------- UTILIDADES PARA POSICIONES RELATIVAS -------------

function pxToRel(xPx, yPx) {
  const plano = document.getElementById('plano');
  return {
    x: xPx / plano.offsetWidth,
    y: yPx / plano.offsetHeight
  };
}
function relToPx(xRel, yRel) {
  const plano = document.getElementById('plano');
  return {
    x: xRel * plano.offsetWidth,
    y: yRel * plano.offsetHeight
  };
}

// ------------- GESTIÓN DE BLOQUES (CRUD) -------------

async function cargarBloques() {
  const snapshot = await db.collection('bloques').where('ubicacion', '==', ubicacionActual).get();
  bloques = [];
  snapshot.forEach(doc => {
    let data = doc.data();
    // Si hay bloques antiguos en px, conviértelos a relativo automáticamente:
    if (data.x > 1 || data.y > 1) {
      const plano = document.getElementById('plano');
      data.x = data.x / plano.offsetWidth;
      data.y = data.y / plano.offsetHeight;
      // Actualiza en Firestore (opcional)
      db.collection('bloques').doc(doc.id).update({ x: data.x, y: data.y });
    }
    data.id = doc.id;
    bloques.push(data);
  });
  renderBloques();
}

async function guardarBloque(bloque) {
  if (!bloque.id) {
    const docRef = await db.collection('bloques').add(bloque);
    bloque.id = docRef.id;
  } else {
    await db.collection('bloques').doc(bloque.id).set(bloque);
  }
  cargarBloques();
}

async function eliminarBloque(bloqueId) {
  await db.collection('bloques').doc(bloqueId).delete();
  cargarBloques();
}

// ------------- RENDERIZADO DE BLOQUES -------------

function renderBloques() {
  const plano = document.getElementById('plano');
  plano.innerHTML = '';
  bloques.forEach(bloque => {
    const div = document.createElement('div');
    div.className = 'bloque' + (bloque.terminado ? ' terminado' : '');
    div.id = 'bloque-' + bloque.id;
    div.tabIndex = 0;
    div.style.position = 'absolute';
    // Calcula posición absoluta a partir del porcentaje
    const { x, y } = relToPx(bloque.x, bloque.y);
    div.style.left = x + 'px';
    div.style.top = y + 'px';

    // El resto de tus datos
    div.innerHTML = `
      <strong>${bloque.actividad || ''}</strong>
      <div>${bloque.matricula || ''}</div>
      <div>${bloque.marca || ''}</div>
      <div>${bloque.cliente || ''}</div>
      ${bloque.trabajador ? `<div>${bloque.trabajador}</div>` : ''}
    `;

    if (modoEdicion) {
      div.style.cursor = 'grab';
      habilitarDrag(div, bloque);
      div.onclick = e => {
        e.stopPropagation();
        mostrarModal(bloque);
      };
    } else {
      div.onclick = e => {
        e.stopPropagation();
        mostrarModal(bloque, true);
      };
    }

    plano.appendChild(div);
  });
}

// ------------- DRAG & DROP -------------

function habilitarDrag(div, bloque) {
  let offsetX = 0, offsetY = 0, dragging = false;

  div.onmousedown = function (e) {
    if (!modoEdicion) return;
    dragging = true;
    const planoRect = document.getElementById('plano').getBoundingClientRect();
    offsetX = e.clientX - div.offsetLeft - planoRect.left;
    offsetY = e.clientY - div.offsetTop - planoRect.top;
    document.onmousemove = function (ev) {
      if (!dragging) return;
      const plano = document.getElementById('plano');
      let xPx = ev.clientX - planoRect.left - offsetX;
      let yPx = ev.clientY - planoRect.top - offsetY;
      // Limita dentro del plano
      xPx = Math.max(0, Math.min(plano.offsetWidth - div.offsetWidth, xPx));
      yPx = Math.max(0, Math.min(plano.offsetHeight - div.offsetHeight, yPx));
      div.style.left = xPx + 'px';
      div.style.top = yPx + 'px';
    };
    document.onmouseup = function (ev) {
      if (!dragging) return;
      dragging = false;
      document.onmousemove = null;
      document.onmouseup = null;
      // Al soltar, guarda la posición relativa
      const xPx = parseFloat(div.style.left);
      const yPx = parseFloat(div.style.top);
      const plano = document.getElementById('plano');
      bloque.x = xPx / plano.offsetWidth;
      bloque.y = yPx / plano.offsetHeight;
      guardarBloque(bloque);
    };
  };
}

// ------------- MODAL DE EDICIÓN -------------

function mostrarModal(bloque, soloLectura = false) {
  bloqueSeleccionado = bloque;
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('actividad').value = bloque.actividad || '';
  document.getElementById('matricula').value = bloque.matricula || '';
  document.getElementById('marca').value = bloque.marca || '';
  document.getElementById('cliente').value = bloque.cliente || '';
  document.getElementById('trabajador').value = bloque.trabajador || '';
  document.getElementById('terminado').checked = !!bloque.terminado;
  // Deshabilita si solo lectura
  [...document.querySelectorAll('#modal input, #modal select')].forEach(el => el.disabled = !!soloLectura);
  document.querySelector('#modal button[onclick="guardarDatos()"]').style.display = soloLectura ? 'none' : '';
  document.querySelector('#modal button[onclick="liberarDatos()"]').style.display = soloLectura ? 'none' : '';
}

document.getElementById('closeModal').onclick = () => {
  document.getElementById('modal').style.display = 'none';
  bloqueSeleccionado = null;
};

window.onclick = function (event) {
  if (event.target === document.getElementById('modal')) {
    document.getElementById('modal').style.display = 'none';
    bloqueSeleccionado = null;
  }
};

async function guardarDatos() {
  if (!bloqueSeleccionado) return;
  bloqueSeleccionado.actividad = document.getElementById('actividad').value;
  bloqueSeleccionado.matricula = document.getElementById('matricula').value;
  bloqueSeleccionado.marca = document.getElementById('marca').value;
  bloqueSeleccionado.cliente = document.getElementById('cliente').value;
  bloqueSeleccionado.trabajador = document.getElementById('trabajador').value;
  bloqueSeleccionado.terminado = document.getElementById('terminado').checked;
  await guardarBloque(bloqueSeleccionado);
  document.getElementById('modal').style.display = 'none';
  bloqueSeleccionado = null;
}

async function liberarDatos() {
  if (!bloqueSeleccionado) return;
  await eliminarBloque(bloqueSeleccionado.id);
  document.getElementById('modal').style.display = 'none';
  bloqueSeleccionado = null;
}

// ------------- CAMBIAR UBICACIÓN (Campa / Taller) -------------

window.alternarUbicacion = function () {
  ubicacionActual = (ubicacionActual === 'taller') ? 'campa' : 'taller';
  document.getElementById('btnUbicacion').innerText = (ubicacionActual === 'taller') ? 'Campa' : 'Taller';
  document.getElementById('plano').className = 'plano-container ' + ubicacionActual;
  cargarBloques();
};

// ------------- CAMBIO DE TAMAÑO DE VENTANA -------------

window.addEventListener('resize', renderBloques);

// ------------- MODOS DE EDICIÓN Y CONFIGURACIÓN -------------

window.mostrarConfiguracion = function () {
  document.getElementById('menuConfiguracion').style.display =
    (document.getElementById('menuConfiguracion').style.display === 'none') ? 'block' : 'none';
};

window.alternarModo = function () {
  modoEdicion = !modoEdicion;
  document.querySelector('#menuConfiguracion button[onclick="alternarModo()"]').innerText =
    modoEdicion ? "Desactivar modo edición" : "Activar modo edición";
  renderBloques();
};

window.confirmarReseteo = function () {
  const pass = prompt('Introduce la contraseña para resetear:');
  if (pass === 'patata') {
    resetearBloques();
  } else if (pass !== null) {
    mostrarMensaje('Contraseña incorrecta.', 'error');
  }
};

async function resetearBloques() {
  const plano = document.getElementById('plano');
  const pos = pxToRel(plano.offsetWidth - 40, plano.offsetHeight - 40);
  for (const bloque of bloques) {
    bloque.x = pos.x;
    bloque.y = pos.y;
    await guardarBloque(bloque);
  }
  mostrarMensaje('Todos los bloques han sido reseteados.', 'success');
}

// ------------- MENSAJES DE ESTADO -------------

function mostrarMensaje(msg, tipo = 'success') {
  const mensaje = document.getElementById('mensajeEstado');
  mensaje.innerText = msg;
  mensaje.className = tipo === 'success' ? 'success' : 'error';
  mensaje.style.display = 'block';
  setTimeout(() => mensaje.style.display = 'none', 2000);
}

// ------------- GESTIÓN DE TRABAJADORES -------------

window.agregarTrabajador = async function () {
  const nombre = document.getElementById('nuevoTrabajador').value.trim();
  if (!nombre) return;
  await db.collection('trabajadores').add({ nombre });
  document.getElementById('nuevoTrabajador').value = '';
  cargarTrabajadores();
};

window.cerrarModalTrabajadores = function () {
  document.getElementById('modalTrabajadores').style.display = 'none';
};

window.onload = async function () {
  // Configura modo inicial y carga datos
  document.getElementById('plano').className = 'plano-container ' + ubicacionActual;
  cargarTrabajadores();
  cargarBloques();
  // Eventos
  document.getElementById('closeModal').onclick = () => {
    document.getElementById('modal').style.display = 'none';
    bloqueSeleccionado = null;
  };
  document.getElementById('actividad').oninput = function () {
    this.value = this.value.replace(/\D/, '').substring(0, 4);
  };
  document.getElementById('btnGestionTrabajadores').onclick = function () {
    document.getElementById('modalTrabajadores').style.display = 'flex';
  };
};

async function cargarTrabajadores() {
  const snapshot = await db.collection('trabajadores').orderBy('nombre').get();
  trabajadores = [];
  snapshot.forEach(doc => trabajadores.push({ id: doc.id, ...doc.data() }));
  // Actualiza el select
  const select = document.getElementById('trabajador');
  if (select) {
    select.innerHTML = `<option value="">Seleccionar trabajador...</option>`;
    trabajadores.forEach(t => {
      select.innerHTML += `<option value="${t.nombre}">${t.nombre}</option>`;
    });
  }
  // Actualiza la lista de trabajadores
  const ul = document.getElementById('listaTrabajadores');
  if (ul) {
    ul.innerHTML = '';
    trabajadores.forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = `${t.nombre} <button onclick="eliminarTrabajador('${t.id}')">✖</button>`;
      ul.appendChild(li);
    });
  }
}

window.eliminarTrabajador = async function (id) {
  await db.collection('trabajadores').doc(id).delete();
  cargarTrabajadores();
};

