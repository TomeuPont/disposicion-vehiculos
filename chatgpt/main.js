// main.js funcional y autocontenible con posiciones relativas

let bloques = []; // Array con los bloques
let modoEdicion = false;
let ubicacionActual = "taller"; // o "campa"
let bloqueEditando = null;
let trabajadores = ["TRABAJADOR 1", "TRABAJADOR 2"];
let contadorId = 1;

// ------- Utilidades para posiciones relativas -------
function pxToRel(xPx, yPx, plano) {
  return {
    x: xPx / plano.offsetWidth,
    y: yPx / plano.offsetHeight
  };
}
function relToPx(xRel, yRel, plano) {
  return {
    x: xRel * plano.offsetWidth,
    y: yRel * plano.offsetHeight
  };
}

// ------- RENDER DE BLOQUES -------
function renderBloques() {
  const plano = document.getElementById("plano");
  plano.innerHTML = "";
  bloques.forEach((bloque) => {
    const div = document.createElement("div");
    div.className = "bloque" + (bloque.terminado ? " terminado" : "");
    div.style.position = "absolute";
    // Calcula posición
    const { x, y } = relToPx(bloque.x, bloque.y, plano);
    div.style.left = x + "px";
    div.style.top = y + "px";
    div.innerHTML = `<div>${bloque.actividad || ""}</div>
      <div>${bloque.matricula || ""}</div>
      <div>${bloque.marca || ""}</div>
      <div>${bloque.cliente || ""}</div>
      ${bloque.trabajador ? `<div>${bloque.trabajador}</div>` : ""}`;

    // Drag & Drop en modo edición
    if (modoEdicion) {
      div.style.cursor = "grab";
      habilitarDrag(div, bloque);
      div.onclick = (e) => {
        e.stopPropagation();
        mostrarModalEdicion(bloque);
      };
    } else {
      div.style.cursor = "pointer";
      div.onclick = (e) => {
        e.stopPropagation();
        mostrarModalEdicion(bloque, true);
      };
    }
    plano.appendChild(div);
  });
}

// ------- DRAG & DROP -------
function habilitarDrag(div, bloque) {
  let offsetX, offsetY, dragging = false;
  div.onmousedown = function (e) {
    dragging = true;
    const plano = document.getElementById("plano");
    const rect = plano.getBoundingClientRect();
    offsetX = e.clientX - div.offsetLeft - rect.left;
    offsetY = e.clientY - div.offsetTop - rect.top;
    document.onmousemove = function (ev) {
      if (!dragging) return;
      let xPx = ev.clientX - rect.left - offsetX;
      let yPx = ev.clientY - rect.top - offsetY;
      xPx = Math.max(0, Math.min(plano.offsetWidth - div.offsetWidth, xPx));
      yPx = Math.max(0, Math.min(plano.offsetHeight - div.offsetHeight, yPx));
      div.style.left = xPx + "px";
      div.style.top = yPx + "px";
    };
    document.onmouseup = function (ev) {
      dragging = false;
      document.onmousemove = null;
      document.onmouseup = null;
      const plano = document.getElementById("plano");
      const xPx = parseFloat(div.style.left);
      const yPx = parseFloat(div.style.top);
      const rel = pxToRel(xPx, yPx, plano);
      bloque.x = rel.x;
      bloque.y = rel.y;
      renderBloques();
    };
  };
}

// ------- MODAL EDICIÓN -------
function mostrarModalEdicion(bloque, soloLectura = false) {
  bloqueEditando = bloque;
  document.getElementById("modal").style.display = "flex";
  document.getElementById("actividad").value = bloque.actividad || "";
  document.getElementById("matricula").value = bloque.matricula || "";
  document.getElementById("marca").value = bloque.marca || "";
  document.getElementById("cliente").value = bloque.cliente || "";
  document.getElementById("trabajador").value = bloque.trabajador || "";
  document.getElementById("terminado").checked = !!bloque.terminado;

  // Solo lectura
  [...document.querySelectorAll('#modal input, #modal select')].forEach(el => el.disabled = !!soloLectura);
  document.querySelector('#modal button[onclick="guardarDatos()"]').style.display = soloLectura ? 'none' : '';
  document.querySelector('#modal button[onclick="liberarDatos()"]').style.display = soloLectura ? 'none' : '';
}
document.getElementById("closeModal").onclick = () => {
  document.getElementById("modal").style.display = "none";
  bloqueEditando = null;
};
window.onclick = function (event) {
  if (event.target === document.getElementById("modal")) {
    document.getElementById("modal").style.display = "none";
    bloqueEditando = null;
  }
};
window.guardarDatos = function () {
  if (!bloqueEditando) return;
  bloqueEditando.actividad = document.getElementById("actividad").value;
  bloqueEditando.matricula = document.getElementById("matricula").value;
  bloqueEditando.marca = document.getElementById("marca").value;
  bloqueEditando.cliente = document.getElementById("cliente").value;
  bloqueEditando.trabajador = document.getElementById("trabajador").value;
  bloqueEditando.terminado = document.getElementById("terminado").checked;
  document.getElementById("modal").style.display = "none";
  bloqueEditando = null;
  renderBloques();
};
window.liberarDatos = function () {
  if (!bloqueEditando) return;
  bloques = bloques.filter(b => b !== bloqueEditando);
  document.getElementById("modal").style.display = "none";
  bloqueEditando = null;
  renderBloques();
};

// ------- BOTONES Y FUNCIONES PANEL LATERAL -------
window.alternarUbicacion = function () {
  ubicacionActual = (ubicacionActual === "taller") ? "campa" : "taller";
  document.getElementById("btnUbicacion").innerText = (ubicacionActual === "taller") ? "Campa" : "Taller";
  document.getElementById("plano").className = "plano-container " + ubicacionActual;
  renderBloques();
};
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
  const pass = prompt("Introduce la contraseña para resetear:");
  if (pass === "patata") {
    resetearBloques();
  }
};
function resetearBloques() {
  const plano = document.getElementById("plano");
  const pos = pxToRel(plano.offsetWidth - 40, plano.offsetHeight - 40, plano);
  bloques.forEach(b => {
    b.x = pos.x;
    b.y = pos.y;
  });
  renderBloques();
}

// ------- TRABAJADORES -------
window.agregarTrabajador = function () {
  const nombre = document.getElementById("nuevoTrabajador").value.trim();
  if (!nombre) return;
  trabajadores.push(nombre);
  cargarTrabajadores();
  document.getElementById("nuevoTrabajador").value = "";
};
function cargarTrabajadores() {
  // Actualiza select
  const select = document.getElementById("trabajador");
  if (select) {
    select.innerHTML = `<option value="">Seleccionar trabajador...</option>`;
    trabajadores.forEach(t => {
      select.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
  // Actualiza la lista
  const ul = document.getElementById("listaTrabajadores");
  if (ul) {
    ul.innerHTML = "";
    trabajadores.forEach((t, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `${t} <button onclick="eliminarTrabajador(${idx})">✖</button>`;
      ul.appendChild(li);
    });
  }
}
window.eliminarTrabajador = function (idx) {
  trabajadores.splice(idx, 1);
  cargarTrabajadores();
};
window.cerrarModalTrabajadores = function () {
  document.getElementById("modalTrabajadores").style.display = "none";
};

// ------- AGREGAR BLOQUES DE EJEMPLO AL INICIO (O DESDE FIRESTORE) -------
function initBloquesEjemplo() {
  // Puedes eliminar esto si cargas de Firestore
  bloques = [
    { x: 0.1, y: 0.1, actividad: 100, matricula: "1234ABC", marca: "VOLVO", cliente: "ACME", trabajador: trabajadores[0], terminado: false, id: contadorId++ },
    { x: 0.4, y: 0.3, actividad: 200, matricula: "5555DEF", marca: "SCANIA", cliente: "EULEN", trabajador: trabajadores[1], terminado: true, id: contadorId++ }
  ];
}

// ------- AJUSTAR TODO AL REDIMENSIONAR -------
window.addEventListener("resize", renderBloques);

// ------- INICIO -------
window.onload = function () {
  document.getElementById("plano").className = "plano-container " + ubicacionActual;
  cargarTrabajadores();
  initBloquesEjemplo();
  renderBloques();
  document.getElementById('btnGestionTrabajadores').onclick = function () {
    document.getElementById('modalTrabajadores').style.display = 'flex';
  };
};
