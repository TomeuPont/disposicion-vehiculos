const firebaseConfig = {
  apiKey: "AIzaSyCQ_bC88QCFloRDHDVPP__9elcmW51pDqk",
  authDomain: "planos-taller-campa.firebaseapp.com",
  projectId: "planos-taller-campa"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let bloques = [];
let datos = {};
let modoEdicion = false;
let bloqueActual;
let ubicacionActual = 'taller';

const plano = document.getElementById('plano');
const modal = document.getElementById('modal');
const actividadInput = document.getElementById('actividad');
const clienteInput = document.getElementById('cliente');
const trabajadorInput = document.getElementById('trabajador');
const matriculaInput = document.getElementById('matricula');
const marcaInput = document.getElementById('marca');
const terminadoInput = document.getElementById('terminado');
const botonUbicacion = document.getElementById('btnUbicacion');
const closeModal = document.getElementById('closeModal');

const posicionesTaller = [...Array(40)].map((_, i) => ({top: 300 + (i % 5) * 60, left: 400 + Math.floor(i / 5) * 60}));
const posicionesCampa = [...Array(40)].map((_, i) => ({top: 100 + (i % 5) * 60, left: 100 + Math.floor(i / 5) * 60}));

function alternarUbicacion() {
  ubicacionActual = ubicacionActual === 'taller' ? 'campa' : 'taller';
  botonUbicacion.textContent = ubicacionActual === 'taller' ? 'Campa' : 'Taller';
  crearBloques();
}

function alternarModo() {
  modoEdicion = !modoEdicion;
  const btn = document.querySelector('#menuConfiguracion button');
  if (btn) {
    btn.textContent = modoEdicion ? 'Bloquear edición' : 'Activar modo edición';
  }
}

function confirmarReseteo() {
  const pass = prompt('Introduce la contraseña para resetear todos los bloques:');
  if (pass === 'patata') {
    if (confirm('¿Estás seguro de que quieres resetear todos los bloques? Esta acción no se puede deshacer.')) {
      datos = {};
      for (let i = 0; i < 80; i++) {
        datos[i] = {
          actividad: '',
          cliente: '',
          trabajador: '',
          matricula: '',
          marca: '',
          ocupado: false,
          topPct: 90,
          leftPct: 90
        };
        db.collection('bloques').doc(i.toString()).set(datos[i]);
      }
      crearBloques();
    }
  } else {
    alert('Contraseña incorrecta.');
  }
}

function mostrarConfiguracion() {
  const menu = document.getElementById('menuConfiguracion');
  menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
}

function crearBloques() {
  plano.innerHTML = '';
  bloques = [];
  const posiciones = ubicacionActual === 'taller' ? posicionesTaller : posicionesCampa;
  for (let i = 0; i < 40; i++) {
    const div = document.createElement('div');
    div.className = 'bloque';
    const globalIndex = ubicacionActual === 'taller' ? i : i + 40;
    div.dataset.index = globalIndex;

    if (!datos[globalIndex]) datos[globalIndex] = {actividad: '', cliente: '', trabajador: '', matricula: '', marca: '', ocupado: false};

    const info = datos[globalIndex];
    if (info.topPct !== undefined && info.leftPct !== undefined) {
      div.style.top = info.topPct.toFixed(2) + '%';
      div.style.left = info.leftPct.toFixed(2) + '%';
    }

    plano.appendChild(div);
    bloques.push(div);

    div.addEventListener('click', () => {
      if (!modoEdicion) abrirModal(div);
    });

    let isDragging = false;
    let offsetX, offsetY;
    let bloqueActivo = null;

    div.addEventListener('mousedown', (e) => {
      if (!modoEdicion) return;
      isDragging = true;
      bloqueActivo = div;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      div.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !modoEdicion || !bloqueActivo) return;
      const rect = plano.getBoundingClientRect();
      const x = e.clientX - rect.left - offsetX;
      const y = e.clientY - rect.top - offsetY;
      if (x >= 0 && y >= 0 && x <= plano.offsetWidth - bloqueActivo.offsetWidth && y <= plano.offsetHeight - bloqueActivo.offsetHeight) {
        bloqueActivo.style.left = `${(x / plano.offsetWidth) * 100}%`;
        bloqueActivo.style.top = `${(y / plano.offsetHeight) * 100}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging && bloqueActivo) {
        isDragging = false;
        bloqueActivo.style.cursor = 'grab';
        const index = bloqueActivo.dataset.index;
        const topPx = bloqueActivo.getBoundingClientRect().top - plano.getBoundingClientRect().top;
        const leftPx = bloqueActivo.getBoundingClientRect().left - plano.getBoundingClientRect().left;
        const topPct = (topPx / plano.offsetHeight) * 100;
        const leftPct = (leftPx / plano.offsetWidth) * 100;
        datos[index].topPct = topPct;
        datos[index].leftPct = leftPct;
        db.collection('bloques').doc(index).set(datos[index]);
        bloqueActivo = null;
      }
    });
  }
  renderizarBloques();
  actualizarFondo();
}

function actualizarFondo() {
  plano.classList.remove('taller', 'campa');
  plano.classList.add(ubicacionActual);
  plano.style.backgroundImage = `url('${ubicacionActual === 'taller' ? 'plano-fondo.png' : 'plano-campa.png'}')`;
}

function abrirModal(bloque) {
  bloqueActual = bloque;
  const index = bloque.dataset.index;
  const info = datos[index];
  actividadInput.value = info.actividad;
  clienteInput.value = info.cliente;
  trabajadorInput.value = info.trabajador;
  matriculaInput.value = info.matricula;
  marcaInput.value = info.marca;
  terminadoInput.checked = info.terminado || false; // Añadir esta línea
  modal.style.display = 'flex';
}
function guardarDatos() {
  const nuevaActividad = parseInt(actividadInput.value);
  if (isNaN(nuevaActividad)) {
    alert("La actividad debe ser un número.");
    return;
  }
  
  const index = bloqueActual.dataset.index;
  const rect = plano.getBoundingClientRect();
  const topPx = bloqueActual.getBoundingClientRect().top - rect.top;
  const leftPx = bloqueActual.getBoundingClientRect().left - rect.left;
  const topPct = (topPx / plano.offsetHeight) * 100;
  const leftPct = (leftPx / plano.offsetWidth) * 100;
  
  datos[index] = {
    actividad: actividadInput.value,
    cliente: clienteInput.value,
    trabajador: trabajadorInput.value,
    matricula: matriculaInput.value.toUpperCase(),
    marca: marcaInput.value.toUpperCase(),
    terminado: terminadoInput.checked,  // Añadir esta línea
    ocupado: true,
    topPct: topPct,
    leftPct: leftPct
  };
  
  db.collection('bloques').doc(index).set(datos[index]);
  renderizarBloques();
  modal.style.display = 'none';
}
function liberarDatos() {
  const index = bloqueActual.dataset.index;
  datos[index] = {
    actividad: '', 
    cliente: '', 
    trabajador: '', 
    matricula: '', 
    marca: '', 
    terminado: false,  // Añadir esta línea
    ocupado: false
  };
  db.collection('bloques').doc(index).set(datos[index]);
  renderizarBloques();
  modal.style.display = 'none';
}
function renderizarBloques() {
  bloques.forEach((bloque) => {
    const i = parseInt(bloque.dataset.index);
    const info = datos[i];
    if (info.topPct !== undefined && info.leftPct !== undefined) {
      bloque.style.top = info.topPct.toFixed(2) + '%';
      bloque.style.left = info.leftPct.toFixed(2) + '%';
    }
    
    if (info.ocupado) {
      if (info.terminado) {
        bloque.style.backgroundColor = '#ff0'; // Amarillo para terminado
      } else if (info.trabajador) {
        bloque.style.backgroundColor = '#f00'; // Rojo para en proceso
      } else {
        bloque.style.backgroundColor = '#8f8'; // Verde para asignado
      }
      bloque.innerHTML = `<div style='font-size:14px; font-weight:bold;'>${info.actividad}</div>`;
    } else {
      bloque.style.backgroundColor = '#ccc'; // Gris para no ocupado
      bloque.innerHTML = ``;
    }
  });
}
closeModal.onclick = () => modal.style.display = 'none';

window.onload = () => {
  db.collection("bloques").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      datos[doc.id] = doc.data();
    });
    crearBloques();
  });
};
