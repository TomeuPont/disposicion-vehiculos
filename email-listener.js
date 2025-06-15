const MailListener = require("mail-listener2");
const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require("nodemailer");

// CONFIGURA ESTO:
const GMAIL_USER = "entradas.veh@gmail.com";
const GMAIL_APP_PASSWORD = "nuhd jajn nrxm npfm";
const GOOGLE_APPLICATION_CREDENTIALS = "planos-taller-campa-07f9aa4add0f.json";

// Nuevo destinatario Trello
const TRELLO_EMAIL = "tolopontripoll+v2p0bezd79oewls5lbpx@boards.trello.com";

// Inicializa Firestore
const db = new Firestore({
  projectId: "planos-taller-campa",
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS
});

// Nodemailer transporter para reenviar emails tal cual
const forwardTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

async function forwardRawEmail(raw) {
  await forwardTransporter.sendMail({
    to: TRELLO_EMAIL,
    envelope: { to: TRELLO_EMAIL },
    raw: raw
  });
}

const mailListener = new MailListener({
  username: GMAIL_USER,
  password: GMAIL_APP_PASSWORD,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  mailbox: "INBOX",
  markSeen: true,
  fetchUnreadOnStart: true,
  tlsOptions: { rejectUnauthorized: false }
});

mailListener.start();

mailListener.on("mail", async (mail, seqno, attributes) => {
  const subject = mail.subject || "";

  // Soporta variantes como: Act: 123 #En_taller, Act 123 #En_taller, Act:123 #Finished, etc.
  const match = subject.match(/Act[:\s]+\s*(\d+)\s*#(En_taller|En_campa|Finished|taller_out|campa_out)/i);

  if (!match) {
    console.log("Correo ignorado, asunto no válido:", subject);
  } else {
    const actividadId = match[1];
    const comando = match[2].toLowerCase();
  
    try {
      if (comando === 'en_taller') {
        await rellenarPrimerBloqueLibre("taller", actividadId);
        console.log(`Bloque libre para taller (${actividadId}) actualizado.`);
      } else if (comando === 'en_campa') {
        await rellenarPrimerBloqueLibre("campa", actividadId);
        console.log(`Bloque libre para campa (${actividadId}) actualizado.`);
      } else if (comando === 'finished') {
        const ok = await terminarBloquePorActividad(actividadId);
        if (ok) {
          console.log(`Bloque con actividad ${actividadId} marcado como terminado.`);
        } else {
          console.log(`No se encontró bloque para terminar con actividad ${actividadId}.`);
        }
      } else if (comando === 'taller_out') {
        const ok = await liberarBloquePorActividad(actividadId, 'taller');
        if (ok) {
          console.log(`Bloque con actividad ${actividadId} liberado en taller.`);
        } else {
          console.log(`No se encontró bloque para liberar con actividad ${actividadId} en taller.`);
        }
      } else if (comando === 'campa_out') {
        const ok = await liberarBloquePorActividad(actividadId, 'campa');
        if (ok) {
          console.log(`Bloque con actividad ${actividadId} liberado en campa.`);
        } else {
          console.log(`No se encontró bloque para liberar con actividad ${actividadId} en campa.`);
        }
      }
    } catch (err) {
      console.error("Error en la acción para el correo:", err);
    }
  }

  // Reenvía siempre el correo tal cual a Trello
  if (mail.raw) {
    try {
      await forwardRawEmail(mail.raw);
      console.log("Correo reenviado a Trello.");
    } catch (err) {
      console.error("Error reenviando a Trello:", err);
    }
  } else {
    console.error("No hay raw en el mail recibido, no se puede reenviar tal cual.");
  }
});

async function rellenarPrimerBloqueLibre(zona, actividadId) {
  // zona: "taller" o "campa"
  const startIdx = zona === "taller" ? 0 : 50;
  const endIdx = zona === "taller" ? 49 : 89;

  // 1. Cargar todos los bloques de la zona
  let bloques = [];
  const snapshot = await db.collection("bloques").get();
  snapshot.forEach(doc => {
    const idx = parseInt(doc.id);
    if (idx >= startIdx && idx <= endIdx) {
      bloques.push({ id: doc.id, ...doc.data() });
    }
  });

  // 2. Filtrar bloques libres
  const libres = bloques.filter(b => !b.ocupado);

  if (libres.length === 0) throw new Error("No hay bloques libres en " + zona);

  // 3. Elegir el más arriba (menor topPct), luego el más a la izquierda (menor leftPct)
  libres.sort((a, b) => {
    if (a.topPct !== undefined && b.topPct !== undefined && a.topPct !== b.topPct) return a.topPct - b.topPct;
    if (a.leftPct !== undefined && b.leftPct !== undefined) return a.leftPct - b.leftPct;
    return 0;
  });
  const elegido = libres[0];

  // 4. Actualizar el bloque elegido
  await db.collection("bloques").doc(elegido.id).set({
    ...elegido,
    actividad: actividadId,
    ocupado: true,
    terminado: false // puedes ajustar esto según tu lógica
  });
}

async function terminarBloquePorActividad(actividadId) {
  // Busca en todos los bloques el que coincida con actividad y márcalo terminado
  const snapshot = await db.collection("bloques").get();
  let found = false;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.actividad && String(data.actividad) === String(actividadId) && data.ocupado) {
      await db.collection("bloques").doc(doc.id).set({
        ...data,
        terminado: true
      });
      found = true;
      break; // Solo el primero que encuentre
    }
  }
  return found;
}

async function liberarBloquePorActividad(actividadId) {
  // Busca en todos los bloques el que coincida con actividad y libéralo
  const snapshot = await db.collection("bloques").get();
  let found = false;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.actividad && String(data.actividad) === String(actividadId) && data.ocupado) {
      await db.collection("bloques").doc(doc.id).set({
        ...data,
        actividad: '',
        cliente: '',
        trabajador: '',
        matricula: '',
        marca: '',
        terminado: false,
        ocupado: false
      });
      found = true;
      break; // Solo el primero que encuentre
    }
  }
  return found;
}

// Reinicio automático en caso de error de conexión (ECONNRESET)
mailListener.on("error", (err) => {
  console.error("Error en mail-listener:", err);
  setTimeout(() => {
    try { mailListener.stop(); } catch (e) {}
    try {
      mailListener.start();
      console.log("Reiniciando mail-listener...");
    } catch (e) {
      console.error("No se pudo reiniciar mail-listener:", e);
    }
  }, 5000);
});