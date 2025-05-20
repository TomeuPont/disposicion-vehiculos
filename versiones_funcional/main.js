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
  
  // Posiciones iniciales basadas en la ubicación
  const posiciones = ubicacionActual === 'taller' ? 
    [...Array(40)].map((_, i) => ({
      left: 15 + (i % 7) * 12,  // Más espaciado horizontal
      top: 20 + Math.floor(i / 7) * 12 // Más espaciado vertical
    })) : 
    [...Array(40)].map((_, i) => ({
      left: 15 + (i % 6) * 14,  // Más espaciado para campa
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

    plano.appendChild(div);
    bloques.push(div);

    // Resto del código de eventos de arrastre...
  }
  renderizarBloques();
  actualizarFondo();
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
  
  // Verificar duplicados (mantener tu código existente)
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
    // Mostrar mensaje de error (mantener tu código)
    return;
  }

  // Obtener posición relativa al contenedor
  const rect = plano.getBoundingClientRect();
  const leftPx = bloqueActual.getBoundingClientRect().left - rect.left;
  const topPx = bloqueActual.getBoundingClientRect().top - rect.top;
  
  // Convertir a porcentajes del contenedor
  const leftPct = (leftPx / rect.width) * 100;
  const topPct = (topPx / rect.height) * 100;
  
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
      
      // Mostrar mensaje de éxito
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
  
  // Mantener la posición actual
  const rect = plano.getBoundingClientRect();
  const leftPx = bloqueActual.getBoundingClientRect().left - rect.left;
  const topPx = bloqueActual.getBoundingClientRect().top - rect.top;
  const leftPct = (leftPx / rect.width) * 100;
  const topPct = (topPx / rect.height) * 100;

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
    if (info.topPct !== undefined && info.leftPct !== undefined) {
      bloque.style.top = info.topPct.toFixed(2) + '%';
      bloque.style.left = info.leftPct.toFixed(2) + '%';
    }
    
    if (info.ocupado) {
      // Cambios realizados aquí:
      if (info.terminado) {
        bloque.style.backgroundColor = '#f00'; // Rojo para terminado
      } else if (info.trabajador) {
        bloque.style.backgroundColor = '#ff0'; // Amarillo para trabajando
      } else {
        bloque.style.backgroundColor = '#8f8'; // Verde para asignado (sin cambios)
      }
      bloque.innerHTML = `<div style='font-size:14px; font-weight:bold;'>${info.actividad}</div>`;
    } else {
      bloque.style.backgroundColor = '#ccc'; // Gris para no ocupado (sin cambios)
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

