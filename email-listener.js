const MailListener = require("mail-listener2");
const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require("nodemailer");

// CONFIGURA ESTO:
const GMAIL_USER = "entradas.veh@gmail.com";
const GMAIL_APP_PASSWORD = "nuhd jajn nrxm npfm";
const GOOGLE_APPLICATION_CREDENTIALS = "planos-taller-campa-07f9aa4add0f.json"; // Descarga desde Google Cloud Console

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

// Función para reenviar el mensaje raw tal cual
async function forwardRawEmail(raw) {
  await forwardTransporter.sendMail({
    to: "tolopontripoll+fwjoriwzljn59jbdls1j@boards.trello.com",
    envelope: { to: "tolopontripoll+fwjoriwzljn59jbdls1j@boards.trello.com" },
    raw: raw // El mensaje EML original, sin tocar nada
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
  const match = subject.match(/Act:\s*(\d+)\s*#(taller|campa)/i);

  if (!match) {
    console.log("Correo ignorado, asunto no válido:", subject);
  } else {
    const actividadId = match[1];
    const tipo = match[2].toLowerCase();

    try {
      await rellenarPrimerBloqueLibre(tipo, actividadId);
      console.log(`Bloque libre para ${tipo} (${actividadId}) actualizado.`);
    } catch (err) {
      console.error("Error al actualizar bloque:", err);
    }
  }

  // REENVÍA EL CORREO TAL CUAL A TRELLO
  // mail.raw está disponible si mail-listener2 está actualizado y mailParserOptions.streamAttachments: false
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

mailListener.on("error", (err) => {
  console.error("Error en mail-listener:", err);
});