const firebaseConfig = {
  apiKey: "AIzaSyCQ_bC88QCFloRDHDVPP__9elcmW51pDqk",
  authDomain: "planos-taller-campa.firebaseapp.com",
  projectId: "planos-taller-campa",
  storageBucket: "planos-taller-campa.firebasestorage.app",
  messagingSenderId: "813627250056",
  appId: "1:813627250056:web:76ecd6f3be6be23690d63d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let bloques = [];
let datos = {};
let modoEdicion = false;
let bloqueActual;
let ubicacionActual = 'taller';
let trabajadores = []; 

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
const listaTrabajadores = document.getElementById('listaTrabajadores');
const posicionesTaller = [...Array(50)].map((_, i) => ({top: 300 + (i % 5) * 60, left: 400 + Math.floor(i / 5) * 60}));
const posicionesCampa = [...Array(40)].map((_, i) => ({top: 100 + (i % 5) * 60, left: 100 + Math.floor(i / 5) * 60}));

function alternarUbicacion() {
  ubicacionActual = ubicacionActual === 'taller' ? 'campa' : 'taller';
  botonUbicacion.textContent = ubicacionActual === 'taller' ? 'Campa' : 'Taller';
  crearBloques();
  actualizarFondo();
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
      for (let i = 0; i < 90; i++) {
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
  [...plano.querySelectorAll('.bloque')].forEach(el => el.remove());
  bloques = [];
  // Definir número de bloques y offset según la ubicación
  const numBloques = ubicacionActual === 'taller' ? 50 : 40;
  const offset = ubicacionActual === 'taller' ? 0 : 50;
  const posiciones = ubicacionActual === 'taller' ? posicionesTaller : 
  posicionesCampa;

  for (let i = 0; i < numBloques; i++) {
    const div = document.createElement('div');
    div.className = 'bloque';
    const globalIndex = i + offset;
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

    // Eventos táctiles (soporte móvil/tablet)
    div.addEventListener('touchstart', function(e) {
      if (!modoEdicion) return;
      isDragging = true;
      bloqueActivo = div;
      const touch = e.touches[0];
      const rect = div.getBoundingClientRect();
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;
      div.style.cursor = 'grabbing';
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
      if (!isDragging || !modoEdicion || !bloqueActivo) return;
      const touch = e.touches[0];
      const rect = plano.getBoundingClientRect();
      const x = touch.clientX - rect.left - offsetX;
      const y = touch.clientY - rect.top - offsetY;
      if (x >= 0 && y >= 0 && x <= plano.offsetWidth - bloqueActivo.offsetWidth && y <= plano.offsetHeight - bloqueActivo.offsetHeight) {
        bloqueActivo.style.left = `${(x / plano.offsetWidth) * 100}%`;
        bloqueActivo.style.top = `${(y / plano.offsetHeight) * 100}%`;
      }
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
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
      e.preventDefault();
    }, { passive: false });
  }
  renderizarBloques();
  actualizarLeyendaContador();
  actualizarTotalVehiculos();
  actualizarFondo();
}


function actualizarFondo() {
  const img = document.getElementById('plano-fondo-img');
  img.classList.remove('campa', 'taller');
  if (ubicacionActual === 'taller') {
    img.src = 'plano-fondo.png';
    img.alt = 'Plano taller';
    img.classList.add('taller');
  } else {
    img.src = 'plano-campa.png';
    img.alt = 'Plano campa';
    img.classList.add('campa');
  }
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
  terminadoInput.checked = info.terminado || false;
  modal.style.display = 'flex';
  setTimeout(() => {
    actividadInput.focus();
    actividadInput.select();
  }, 50);

}
function guardarDatos() {
  const nuevaActividad = parseInt(actividadInput.value);
  if (isNaN(nuevaActividad)) {
    alert("La actividad debe ser un número válido.");
    return;
  }

  const indexActual = bloqueActual.dataset.index;
  
  let bloqueExistente = null;
  let ubicacionExistente = '';
  
  for (let id in datos) {
    if (id !== indexActual && datos[id].actividad && parseInt(datos[id].actividad) === nuevaActividad) {
      bloqueExistente = id;
      ubicacionExistente = id < 40 ? 'el Taller' : 'la Campa';
      break;
    }
  }

  if (bloqueExistente !== null) {
    const mensaje = `¡El número de actividad ${nuevaActividad} ya existe en ${ubicacionExistente} (Bloque ${parseInt(bloqueExistente)+1}).`;
    const mensajeEstado = document.getElementById('mensajeEstado');
    mensajeEstado.textContent = mensaje;
    mensajeEstado.style.display = 'block';
    mensajeEstado.style.backgroundColor = '#ffcccc';
    setTimeout(() => {
      mensajeEstado.style.display = 'none';
    }, 5000);
    return;
  }

  const rect = plano.getBoundingClientRect();
  const topPx = bloqueActual.getBoundingClientRect().top - rect.top;
  const leftPx = bloqueActual.getBoundingClientRect().left - rect.left;
  const topPct = (topPx / plano.offsetHeight) * 100;
  const leftPct = (leftPx / plano.offsetWidth) * 100;

  datos[indexActual] = {
    actividad: actividadInput.value,
    cliente: clienteInput.value,
    trabajador: trabajadorInput.value,
    matricula: matriculaInput.value.toUpperCase(),
    marca: marcaInput.value.toUpperCase(),
    terminado: terminadoInput.checked,
    ocupado: true,
    topPct: topPct,
    leftPct: leftPct
  };
  
  db.collection('bloques').doc(indexActual).set(datos[indexActual]);
  modal.style.display = 'none';
  
  const mensajeEstado = document.getElementById('mensajeEstado');
  mensajeEstado.textContent = `Actividad ${nuevaActividad} guardada correctamente.`;
  mensajeEstado.style.display = 'block';
  mensajeEstado.style.backgroundColor = '#ccffcc';
  setTimeout(() => {
    mensajeEstado.style.display = 'none';
  }, 3000);
}

function liberarDatos() {
  const index = bloqueActual.dataset.index;
  // Esquina inferior derecha (por ejemplo: top: 90%, left: 90%)
  const topPct = 90;
  const leftPct = 90;

  datos[index] = {
    actividad: '',
    cliente: '',
    trabajador: '',
    matricula: '',
    marca: '',
    terminado: false,
    ocupado: false,
    topPct: topPct,
    leftPct: leftPct
  };

  db.collection('bloques').doc(index).set(datos[index])
    .then(() => {
      renderizarBloques();
      modal.style.display = 'none';
      const mensajeEstado = document.getElementById('mensajeEstado');
      mensajeEstado.textContent = 'Bloque liberado correctamente.';
      mensajeEstado.className = 'success';
      mensajeEstado.style.display = 'block';
      setTimeout(() => {
        mensajeEstado.style.display = 'none';
      }, 3000);
    })
    .catch((error) => {
      console.error("Error al liberar bloque: ", error);
    });
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
        bloque.style.backgroundColor = '#f00';
      } else if (info.trabajador) {
        bloque.style.backgroundColor = '#ff0';
      } else {
        bloque.style.backgroundColor = '#8f8';
      }
      bloque.innerHTML = `<div style='font-size:14px; font-weight:bold;'>${info.actividad}</div>`;
    } else {
      bloque.style.backgroundColor = '#ccc';
      bloque.innerHTML = ``;
    }
  });
}



closeModal.onclick = () => modal.style.display = 'none';

function mostrarGestionTrabajadores() {
  const modal = document.getElementById('modalTrabajadores');
  const lista = document.getElementById('listaTrabajadores');
  lista.innerHTML = '';
  if (trabajadores.length === 0) {
    lista.innerHTML = '<li style="color: #777; padding: 10px; text-align: center;">No hay trabajadores registrados</li>';
  } else {
    trabajadores.sort().forEach(trabajador => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${trabajador}</span>
        <button class="btn-eliminar-trabajador" data-nombre="${trabajador}">Eliminar</button>
      `;
      lista.appendChild(li);
    });
  }
  modal.style.display = 'flex';
  document.getElementById('menuConfiguracion').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGestionTrabajadores').addEventListener('click', mostrarGestionTrabajadores);
  document.getElementById('listaTrabajadores').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-eliminar-trabajador')) {
      eliminarTrabajador(e.target.dataset.nombre);
    }
  });

  // --- Slider tamaño bloques ---
  if (document.getElementById('tamanoBloque')) {
    initTamanoSlider();
  }

  if (shouldHideFullscreenButton()) {
    const btn = document.getElementById('btnFullscreen');
    if (btn) btn.style.display = 'none';
  }
});

function initTamanoSlider() {
  const slider = document.getElementById('tamanoBloque');
  const valor = document.getElementById('tamanoBloqueValor');
  let tamano = parseInt(localStorage.getItem('tamanoBloque') || slider.value || 4);
  slider.value = tamano;
  valor.textContent = tamano;
  document.documentElement.style.setProperty('--tamano-bloque', tamano + 'vw');
  slider.addEventListener('input', (e) => {
    tamano = parseInt(e.target.value);
    valor.textContent = tamano;
    document.documentElement.style.setProperty('--tamano-bloque', tamano + 'vw');
    localStorage.setItem('tamanoBloque', tamano);
  });
}



function cerrarModalTrabajadores() {
  document.getElementById('modalTrabajadores').style.display = 'none';
}

function agregarTrabajador() {
  const input = document.getElementById('nuevoTrabajador');
  const nombre = input.value.trim().toUpperCase();
  if (nombre && !trabajadores.includes(nombre)) {
    db.collection("trabajadores").add({
      nombre: nombre
    }).then(() => {
      trabajadores.push(nombre);
      actualizarSelectTrabajadores();
      mostrarGestionTrabajadores();
      input.value = '';
      const mensajeEstado = document.getElementById('mensajeEstado');
      mensajeEstado.textContent = `TRABAJADOR ${nombre} AÑADIDO CORRECTAMENTE.`;
      mensajeEstado.className = 'success';
      mensajeEstado.style.display = 'block';
      setTimeout(() => {
        mensajeEstado.style.display = 'none';
      }, 3000);
    }).catch(error => {
      console.error("Error al añadir trabajador: ", error);
      alert("ERROR AL AÑADIR TRABAJADOR");
    });
  } else if (trabajadores.includes(nombre)) {
    alert('ESTE TRABAJADOR YA EXISTE');
  }
}

function eliminarTrabajador(nombre) {
  if (confirm(`¿Eliminar al trabajador ${nombre}?`)) {
    db.collection("trabajadores")
      .where("nombre", "==", nombre)
      .get()
      .then((querySnapshot) => {
        const eliminaciones = [];
        querySnapshot.forEach((doc) => {
          eliminaciones.push(doc.ref.delete());
        });
        return Promise.all(eliminaciones);
      })
      .then(() => {
        trabajadores = trabajadores.filter(t => t !== nombre);
        actualizarSelectTrabajadores();
        mostrarGestionTrabajadores();
        const mensajeEstado = document.getElementById('mensajeEstado');
        mensajeEstado.textContent = `Trabajador ${nombre} eliminado correctamente.`;
        mensajeEstado.className = 'success';
        mensajeEstado.style.display = 'block';
        setTimeout(() => {
          mensajeEstado.style.display = 'none';
        }, 3000);
      })
      .catch((error) => {
        console.error("Error al eliminar trabajador: ", error);
        alert("Error al eliminar trabajador");
      });
  }
}

function cargarTrabajadores() {
  return new Promise((resolve) => {
    db.collection("trabajadores").get().then((querySnapshot) => {
      trabajadores = [];
      querySnapshot.forEach((doc) => {
        const trabajadorData = doc.data();
        if (trabajadorData.nombre && typeof trabajadorData.nombre === 'string') {
          const nombre = trabajadorData.nombre.toUpperCase();
          trabajadores.push(nombre);
          if (trabajadorData.nombre !== nombre) {
            doc.ref.update({ nombre: nombre });
          }
        } else {
          console.warn(`Documento ${doc.id} no tiene un nombre válido:`, trabajadorData);
        }
      });
      actualizarSelectTrabajadores();
      resolve();
    }).catch(error => {
      console.error("Error cargando trabajadores:", error);
      resolve();
    });
  });
}

function actualizarSelectTrabajadores() {
  const select = document.getElementById('trabajador');
  while (select.options.length > 1) {
    select.remove(1);
  }
  if (trabajadores.length === 0) {
    console.warn("No hay trabajadores válidos cargados");
    return;
  }
  trabajadores.sort().forEach(trabajador => {
    if (trabajador && typeof trabajador === 'string') {
      const option = new Option(trabajador, trabajador);
      select.add(option);
    }
  });
}

window.onload = async () => {
  db.collection("bloques").onSnapshot((querySnapshot) => {
    datos = {};
    querySnapshot.forEach((doc) => {
      datos[doc.id] = doc.data();
    });
    crearBloques();
  });
  await cargarTrabajadores();
};

function monitorizarCalidadDatos() {
  db.collection("trabajadores").get().then((querySnapshot) => {
    const reporte = {
      total: querySnapshot.size,
      invalidos: 0,
      detalles: []
    };
    querySnapshot.forEach((doc) => {
      if (!doc.data().nombre || typeof doc.data().nombre !== 'string') {
        reporte.invalidos++;
        reporte.detalles.push({
          id: doc.id,
          data: doc.data()
        });
      }
    });
    if (reporte.invalidos > 0) {
      console.warn("Documentos inválidos detectados:", reporte);
    }
  });
}

document.getElementById('btnFullscreen').addEventListener('click', () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }
});

function shouldHideFullscreenButton() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

setInterval(monitorizarCalidadDatos, 86400000);


function contarBloquesPorEstado(datos, ubicacion) {
  const conteo = {
    libre: 0,
    ocupado: 0,
    trabajando: 0,
    terminado: 0,
  };
  let start, end;
  if (ubicacion === 'taller') {
    start = 0;
    end = 49;
  } else {
    start = 50;
    end = 89;
  }
  for (let i = start; i <= end; i++) {
    const info = datos[i];
    if (!info || !info.ocupado) {
      conteo.libre++;
    } else if (info.terminado) {
      conteo.terminado++;
    } else if (info.trabajador) {
      conteo.trabajando++;
    } else {
      conteo.ocupado++;
    }
  }
  return conteo;
}

function actualizarLeyendaContador() {
  const leyenda = document.querySelector('.leyenda-colores');
  if (!leyenda) return;
  const conteo = contarBloquesPorEstado(datos, ubicacionActual);
  leyenda.innerHTML = `
    <span class="color-muestra libre"></span> Libre <b>(${conteo.libre})</b>
    <span class="color-muestra ocupado"></span> Ocupado <b>(${conteo.ocupado})</b>
    <span class="color-muestra trabajando"></span> Trabajando <b>(${conteo.trabajando})</b>
    <span class="color-muestra terminado"></span> Terminado <b>(${conteo.terminado})</b>
  `;
}


function actualizarTotalVehiculos() {
  // TALLER: bloques 0-49, CAMPA: bloques 50-89
  let totalTaller = 0;
  let totalCampa = 0;
  // Suma ocupados (incluye ocupado, trabajando y terminado)
  for (let i = 0; i <= 49; i++) {
    const info = datos[i];
    if (info && info.ocupado) totalTaller++;
  }
  for (let i = 50; i <= 89; i++) {
    const info = datos[i];
    if (info && info.ocupado) totalCampa++;
  }
  const div = document.getElementById('totalVehiculos');
  if (div) {
    div.innerHTML = `Vehículos en <b>Taller</b>: ${totalTaller} &nbsp;|&nbsp; <b>Campa</b>: ${totalCampa}`;
  }
}
