const MailListener = require("mail-listener2");
const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require("nodemailer");

const GMAIL_USER = "entradas.veh@gmail.com";
const GMAIL_APP_PASSWORD = "nuhd jajn nrxm npfm";
const GOOGLE_APPLICATION_CREDENTIALS = "planos-taller-campa-07f9aa4add0f.json";
const TRELLO_EMAIL = "tolopontripoll+v2p0bezd79oewls5lbpx@boards.trello.com";

const db = new Firestore({
  projectId: "planos-taller-campa",
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS
});

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

async function forwardMailReconstructed(mail) {
  await forwardTransporter.sendMail({
    to: TRELLO_EMAIL,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments: mail.attachments || []
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
  tlsOptions: { rejectUnauthorized: false },
  mailParserOptions: { streamAttachments: false },
  attachments: false
});

mailListener.start();

mailListener.on("mail", async (mail, seqno, attributes) => {
  const subject = mail.subject || "";

  // DEBUG
  console.log('DEBUG asunto:', subject);

  // Regex más flexible
  const match = subject.match(/Act[:\s]*\s*(\d+)\s*#(En_taller|En_campa|Finished|taller_out|campa_out)/i);

  // DEBUG
  console.log('DEBUG regex match:', match);

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

  // RAW handling, fallback to reconstructed
  const rawMessage = mail.raw || (attributes && attributes["body[]"]);
  if (rawMessage) {
    try {
      await forwardRawEmail(rawMessage);
      console.log("Correo reenviado a Trello.");
    } catch (err) {
      console.error("Error reenviando a Trello:", err);
    }
  } else {
    try {
      await forwardMailReconstructed(mail);
      console.log("Correo reconstruido y reenviado a Trello (sin raw).");
    } catch (err) {
      console.error("No se pudo reenviar ni reconstruido:", err);
    }
  }
});

async function rellenarPrimerBloqueLibre(zona, actividadId) {
    const startIdx = zona === "taller" ? 0 : 50;
    const endIdx = zona === "taller" ? 49 : 89;
  
    let bloques = [];
    const snapshot = await db.collection("bloques").get();
    snapshot.forEach(doc => {
      const idx = parseInt(doc.id);
      if (idx >= startIdx && idx <= endIdx) {
        bloques.push({ id: doc.id, ...doc.data() });
      }
    });
  
    bloques = bloques.filter(b => !b.ocupado);
    if (bloques.length === 0) throw new Error("No hay bloques libres en " + zona);
  
    // ORDEN CORRECTO: arriba (menor topPct), luego izquierda (menor leftPct)
    // Antes del sort
console.log("=== BLOQUES LIBRES ===");
bloques.forEach(b => {
  console.log(`ID: ${b.id} topPct: ${b.topPct} leftPct: ${b.leftPct}`);
});

// El sort (prueba con topA - topB, si sale mal prueba topB - topA)
bloques.sort((a, b) => {
  const topA = Number(a.topPct) || 0;
  const topB = Number(b.topPct) || 0;
  const leftA = Number(a.leftPct) || 0;
  const leftB = Number(b.leftPct) || 0;
  if (topA !== topB) return topA - topB;
  return leftA - leftB;
});

// Después del sort
console.log("=== BLOQUES ORDENADOS ===");
bloques.forEach(b => {
  console.log(`ID: ${b.id} topPct: ${b.topPct} leftPct: ${b.leftPct}`);
});
console.log("Elegido:", bloques[0]);
  
    const elegido = bloques[0];
  
    await db.collection("bloques").doc(elegido.id).set({
      ...elegido,
      actividad: actividadId,
      ocupado: true,
      terminado: false,
    });
  }


async function terminarBloquePorActividad(actividadId) {
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
      break;
    }
  }
  return found;
}

async function liberarBloquePorActividad(actividadId, zona) {
  let startIdx = 0, endIdx = 89;
  if (zona === "taller") { startIdx = 0; endIdx = 49; }
  else if (zona === "campa") { startIdx = 50; endIdx = 89; }
  const snapshot = await db.collection("bloques").get();
  let found = false;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const idx = parseInt(doc.id);
    if (idx >= startIdx && idx <= endIdx && data.actividad && String(data.actividad) === String(actividadId) && data.ocupado) {
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
      break;
    }
  }
  return found;
}

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