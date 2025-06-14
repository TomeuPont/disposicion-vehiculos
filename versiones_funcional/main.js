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
const posicionesTaller = [...Array(40)].map((_, i) => ({top: 300 + (i % 5) * 60, left: 400 + Math.floor(i / 5) * 60}));
const posicionesCampa = [...Array(40)].map((_, i) => ({top: 100 + (i % 5) * 60, left: 100 + Math.floor(i / 5) * 60}));
const configPosiciones = {
  taller: {
    columnas: 7,
    filas: 6,
    inicioX: 12, // % desde izquierda
    inicioY: 15, // % desde arriba
    espacioX: 12, // % entre columnas
    espacioY: 10  // % entre filas
  },
  campa: {
    columnas: 6,
    filas: 7,
    inicioX: 10,
    inicioY: 12,
    espacioX: 14,
    espacioY: 8
  }
};

function crearBloques() {
  plano.innerHTML = '';
  bloques = [];
  
  const config = ubicacionActual === 'taller' ? configPosiciones.taller : configPosiciones.campa;

  for (let i = 0; i < 40; i++) {
    const div = document.createElement('div');
    div.className = 'bloque';
    const globalIndex = ubicacionActual === 'taller' ? i : i + 40;
    div.dataset.index = globalIndex;

    // Calcular posición basada en la configuración
    const col = i % config.columnas;
    const fila = Math.floor(i / config.columnas);
    const left = config.inicioX + (col * config.espacioX);
    const top = config.inicioY + (fila * config.espacioY);

    if (!datos[globalIndex]) {
      datos[globalIndex] = {
        // ...otros campos...
        topPct: top,
        leftPct: left
      };
    }

    // Aplicar posición
    div.style.left = `${datos[globalIndex].leftPct || left}%`;
    div.style.top = `${datos[globalIndex].topPct || top}%`;

  
  // Variables para el sistema de arrastre
  let isDragging = false;
  let bloqueActivo = null;
  let offsetX, offsetY;

  // Manejadores de eventos globales
  const handleMouseMove = (e) => {
    if (!isDragging || !bloqueActivo || !modoEdicion) return;
    
    const rect = plano.getBoundingClientRect();
    const leftPct = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
    const topPct = ((e.clientY - rect.top - offsetY) / rect.height) * 100;
    
    bloqueActivo.style.left = `${Math.max(0, Math.min(100, leftPct))}%`;
    bloqueActivo.style.top = `${Math.max(0, Math.min(100, topPct))}%`;
  };

  const handleMouseUp = () => {
    if (isDragging && bloqueActivo) {
      isDragging = false;
      bloqueActivo.style.cursor = 'grab';
      
      const index = bloqueActivo.dataset.index;
      const leftPct = parseFloat(bloqueActivo.style.left);
      const topPct = parseFloat(bloqueActivo.style.top);
      
      datos[index].leftPct = leftPct;
      datos[index].topPct = topPct;
      
      db.collection('bloques').doc(index).update({
        leftPct: leftPct,
        topPct: topPct
      });
      
      bloqueActivo = null;
    }
  };

  // Configurar listeners globales una sola vez
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Posiciones iniciales
  const posiciones = ubicacionActual === 'taller' ? 
    [...Array(40)].map((_, i) => ({
      left: 15 + (i % 7) * 12,
      top: 20 + Math.floor(i / 7) * 12
    })) : 
    [...Array(40)].map((_, i) => ({
      left: 15 + (i % 6) * 14,
      top: 20 + Math.floor(i / 6) * 14
    }));

  for (let i = 0; i < 40; i++) {
    const div = document.createElement('div');
    div.className = 'bloque';
    const globalIndex = ubicacionActual === 'taller' ? i : i + 40;
    div.dataset.index = globalIndex;

    if (!datos[globalIndex]) {
      datos[globalIndex] = {
        actividad: '',
        cliente: '',
        trabajador: '',
        matricula: '',
        marca: '',
        ocupado: false,
        topPct: posiciones[i].top,
        leftPct: posiciones[i].left
      };
    }

    const info = datos[globalIndex];
    div.style.left = `${info.leftPct}%`;
    div.style.top = `${info.topPct}%`;

    // Evento click para abrir modal (solo cuando no esté en modo edición)
    div.addEventListener('click', (e) => {
      if (!modoEdicion) {
        e.stopPropagation();
        abrirModal(div);
      }
    });

    // Evento mousedown para arrastre (solo en modo edición)
    div.addEventListener('mousedown', (e) => {
      if (modoEdicion) {
        e.stopPropagation();
        isDragging = true;
        bloqueActivo = div;
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        div.style.cursor = 'grabbing';
      }
    });

    plano.appendChild(div);
    bloques.push(div);
  }
  
  renderizarBloques();
  actualizarFondo();
}

    
  
}




function alternarUbicacion() {
  ubicacionActual = ubicacionActual === 'taller' ? 'campa' : 'taller';
  botonUbicacion.textContent = ubicacionActual === 'taller' ? 'Campa' : 'Taller';
  crearBloques();
}

function alternarModo() {
  modoEdicion = !modoEdicion;
  const btn = document.querySelector('#menuConfiguracion button:first-child');
  if (btn) {
    btn.textContent = modoEdicion ? 'Desactivar modo edición' : 'Activar modo edición';
  }
  
  // Feedback visual del modo edición
  if (modoEdicion) {
    plano.style.outline = '2px dashed #4CAF50';
  } else {
    plano.style.outline = 'none';
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

function actualizarFondo() {
  plano.classList.remove('taller', 'campa');
  plano.classList.add(ubicacionActual);
  
  // Ajustes específicos para cada ubicación
  if (ubicacionActual === 'taller') {
    plano.style.backgroundPosition = 'center 60%';
  } else {
    plano.style.backgroundPosition = 'center 40%';
  }
}

function abrirModal(bloque) {
  // Verificar si el modo edición está activo
  if (modoEdicion) return;
  
  bloqueActual = bloque;
  const index = bloque.dataset.index;
  const info = datos[index];
  
  // Llenar el formulario del modal
  actividadInput.value = info.actividad || '';
  clienteInput.value = info.cliente || '';
  trabajadorInput.value = info.trabajador || '';
  matriculaInput.value = info.matricula || '';
  marcaInput.value = info.marca || '';
  terminadoInput.checked = info.terminado || false;
  
  // Mostrar el modal
  modal.style.display = 'flex';
  
  // Enfocar el primer campo
  actividadInput.focus();
}


function guardarDatos() {
  const nuevaActividad = parseInt(actividadInput.value);
  if (isNaN(nuevaActividad)) {
    alert("La actividad debe ser un número válido.");
    return;
  }

  const indexActual = bloqueActual.dataset.index;
  
  // Buscar si ya existe esta actividad en otro bloque
  let ubicacionDuplicado = null;
  
  for (let id in datos) {
    if (id !== indexActual && datos[id].actividad && parseInt(datos[id].actividad) === nuevaActividad) {
      ubicacionDuplicado = id < 40 ? 'taller' : 'campa';
      break;
    }
  }

  if (ubicacionDuplicado) {
    const mensajeEstado = document.getElementById('mensajeEstado');
    mensajeEstado.textContent = `¡La actividad ${nuevaActividad} ya existe en ${ubicacionDuplicado}!`;
    mensajeEstado.style.display = 'block';
    mensajeEstado.style.backgroundColor = '#ffcccc';
    
    setTimeout(() => {
      mensajeEstado.style.display = 'none';
    }, 5000);
    
    return; // No permitir guardar
  }

  // Resto de la función permanece igual...
  const leftPct = parseFloat(bloqueActual.style.left);
  const topPct = parseFloat(bloqueActual.style.top);
  
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
  
  db.collection('bloques').doc(indexActual).set(datos[indexActual])
    .then(() => {
      renderizarBloques();
      modal.style.display = 'none';
      
      const mensajeEstado = document.getElementById('mensajeEstado');
      mensajeEstado.textContent = `Actividad ${nuevaActividad} guardada correctamente.`;
      mensajeEstado.style.display = 'block';
      mensajeEstado.style.backgroundColor = '#ccffcc';
      
      setTimeout(() => {
        mensajeEstado.style.display = 'none';
      }, 3000);
    })
    .catch(error => {
      console.error("Error al guardar:", error);
      alert("Error al guardar los datos");
    });
}


function liberarDatos() {
  const index = bloqueActual.dataset.index;
  
  // Obtener posición ACTUAL del bloque (sin recálculos)
  const leftPct = parseFloat(bloqueActual.style.left);
  const topPct = parseFloat(bloqueActual.style.top);

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
      mensajeEstado.style.display = 'block';
      mensajeEstado.style.backgroundColor = '#ccffcc';
      
      setTimeout(() => {
        mensajeEstado.style.display = 'none';
      }, 3000);
    })
    .catch((error) => {
      console.error("Error al liberar bloque:", error);
      alert("Error al liberar el bloque");
    });
}


function renderizarBloques() {
  bloques.forEach((bloque) => {
    const i = parseInt(bloque.dataset.index);
    const info = datos[i];
    
    // Solo actualizar si los valores existen
    if (info.topPct !== undefined && info.leftPct !== undefined) {
      bloque.style.left = `${info.leftPct}%`;
      bloque.style.top = `${info.topPct}%`;
    }
    
    // Resto del código de renderizado...
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
  
  // Limpiar lista actual
  lista.innerHTML = '';
  
  // Mostrar mensaje si no hay trabajadores
  if (trabajadores.length === 0) {
    lista.innerHTML = '<li style="color: #777; padding: 10px; text-align: center;">No hay trabajadores registrados</li>';
  } else {
    // Ordenar y mostrar trabajadores
    trabajadores.sort().forEach(trabajador => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${trabajador}</span>
        <button class="btn-eliminar-trabajador" data-nombre="${trabajador}">Eliminar</button>
      `;
      lista.appendChild(li);
    });
  }
  
  // Mostrar modal y ocultar menú configuración
  modal.style.display = 'flex';
  document.getElementById('menuConfiguracion').style.display = 'none';
}

// Modificar el event listener para el botón
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGestionTrabajadores').addEventListener('click', mostrarGestionTrabajadores);
  
  // Delegación de eventos para los botones eliminar
  document.getElementById('listaTrabajadores').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-eliminar-trabajador')) {
      eliminarTrabajador(e.target.dataset.nombre);
    }
  });
});

function cerrarModalTrabajadores() {
  document.getElementById('modalTrabajadores').style.display = 'none';
}

function agregarTrabajador() {
  const input = document.getElementById('nuevoTrabajador');
  const nombre = input.value.trim().toUpperCase(); // Convertir a mayúsculas
  
  if (nombre && !trabajadores.includes(nombre)) {
    db.collection("trabajadores").add({
      nombre: nombre
    }).then(() => {
      // Actualizar la lista inmediatamente después de añadir
      trabajadores.push(nombre);
      actualizarSelectTrabajadores();
      mostrarGestionTrabajadores();
      input.value = '';
      
      // Mostrar mensaje de éxito
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
        mostrarGestionTrabajadores(); // Actualizar la vista
        
        // Mostrar mensaje de éxito
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
        // Verificar que el campo 'nombre' existe y no es null/undefined
        if (trabajadorData.nombre && typeof trabajadorData.nombre === 'string') {
          const nombre = trabajadorData.nombre.toUpperCase();
          trabajadores.push(nombre);
          
          // Actualizar en Firebase si no estaba en mayúsculas
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
  
  // Limpiar select manteniendo la primera opción por defecto
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  if (trabajadores.length === 0) {
    console.warn("No hay trabajadores válidos cargados");
    return;
  }
  
  // Ordenar alfabéticamente y añadir opciones
  trabajadores.sort().forEach(trabajador => {
    if (trabajador && typeof trabajador === 'string') {
      const option = new Option(trabajador, trabajador);
      select.add(option);
    }
  });
}

window.onload = async () => {
  // Cargar bloques primero
  db.collection("bloques").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      datos[doc.id] = doc.data();
    });
    crearBloques();
  });
  
  // Luego cargar trabajadores y esperar a que termine
  await cargarTrabajadores();
};
;

// Añade esta función para verificar periódicamente la calidad de los datos
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
      // Opcional: enviar notificación por email o a un canal de Slack
    }
  });
}

// Ejecutar cada 24 horas
setInterval(monitorizarCalidadDatos, 86400000);

// Manejar redimensionamiento de pantalla
window.addEventListener('resize', function() {
  // Asegurar que el contenedor mantenga la relación de aspecto
  crearBloques();
});

