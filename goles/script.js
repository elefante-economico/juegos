// GOLES! — resolvé la operación de cada tiro: si el resultado supera el 50%, es gol.

const CONFIG = {
  vidas: 3,              // atajadas permitidas antes de que termine el partido
  umbral: 50,            // probabilidad (%) que hay que superar para convertir
  golesPorNivel: 3,      // cada tantos goles subís de nivel
  tiempoBase: 20,        // segundos por tiro en el nivel 1
  reduccionTiempo: 2,    // segundos que se restan por nivel
  tiempoMin: 8,
};

const estado = {
  goles: 0,
  vidas: CONFIG.vidas,
  ronda: [],             // [{ r: resultado, op: "38 + 25" }] x 9
  fase: "jugando",       // "jugando" | "resuelto" | "terminado"
  tiempo: 0,
  tiempoTotal: 0,
  temporizador: null,
  recordPrevio: 0,
};

let celdas = [];         // [{ boton, op, res }]

const $ = (id) => document.getElementById(id);
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = (lista) => lista[aleatorio(0, lista.length - 1)];

// Escribe texto en un elemento; si no existe en el HTML, lo ignora sin romper el juego.
const escribir = (id, texto) => {
  const el = $(id);
  if (el) el.textContent = texto;
};

function mezclar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = aleatorio(0, i);
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// ---------- Récord (se guarda en el navegador) ----------

const CLAVE_RECORD = "goles_record";

function leerRecord() {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0;
  } catch (e) {
    return 0;
  }
}

function registrarRecord() {
  if (estado.goles > leerRecord()) {
    try {
      localStorage.setItem(CLAVE_RECORD, String(estado.goles));
    } catch (e) {
      /* sin almacenamiento disponible: el juego sigue igual */
    }
  }
}

// ---------- Niveles y rangos ----------

const RANGOS = [
  "Pibe de potrero",
  "Promesa de las inferiores",
  "Goleador de barrio",
  "Crack del torneo",
  "Pichichi de la liga",
  "Bota de Oro",
  "Leyenda del Mundial",
];

const nivelActual = () => 1 + Math.floor(estado.goles / CONFIG.golesPorNivel);
const rangoDe = (nivel) => RANGOS[Math.min(nivel - 1, RANGOS.length - 1)];
const tiempoDeTiro = (nivel) =>
  Math.max(CONFIG.tiempoBase - CONFIG.reduccionTiempo * (nivel - 1), CONFIG.tiempoMin);

// ---------- Operaciones ----------

// Cada generador devuelve una operación cuyo resultado es exactamente r (o null si no puede).
const generadores = {
  suma: (r) => {
    if (r < 2) return null;
    const a = aleatorio(1, r - 1);
    return `${a} + ${r - a}`;
  },
  resta: (r, nivel) => {
    const tope = 60 + nivel * 40;
    const b = aleatorio(1, Math.max(1, tope - r));
    return `${r + b} − ${b}`;
  },
  mult: (r) => {
    const pares = [];
    for (let a = 2; a <= 12; a++) {
      if (r % a === 0 && r / a >= 2 && r / a <= 12) pares.push([a, r / a]);
    }
    if (pares.length === 0) return null;
    const [a, b] = elegir(pares);
    return `${a} × ${b}`;
  },
  div: (r) => {
    const b = aleatorio(2, 9);
    return `${r * b} ÷ ${b}`;
  },
};

function construirOperacion(r, nivel) {
  const tipos = ["suma", "resta"];
  if (nivel >= 2) tipos.push("mult");
  if (nivel >= 3) tipos.push("div");

  for (const tipo of mezclar(tipos)) {
    const op = generadores[tipo](r, nivel);
    if (op) return op;
  }
  return generadores.resta(r, nivel);
}

// En niveles altos muchos resultados quedan cerca del 50% para que cueste decidir.
const resultadoGol = (nivel) =>
  nivel >= 3 && Math.random() < 0.5 ? aleatorio(51, 58) : aleatorio(51, 99);

const resultadoAtaja = (nivel) =>
  nivel >= 3 && Math.random() < 0.5 ? aleatorio(42, 50) : aleatorio(2, 50);

function generarRonda() {
  const nivel = nivelActual();

  // Al principio hay más tiros buenos; después, cada vez menos.
  const minGol = nivel <= 2 ? 2 : 1;
  const maxGol = nivel <= 2 ? 4 : nivel <= 4 ? 3 : 2;
  const cantidadGol = aleatorio(minGol, maxGol);

  const usados = new Set();
  const unico = (generar) => {
    let r;
    for (let intento = 0; intento < 50; intento++) {
      r = generar();
      if (!usados.has(r)) break;
    }
    usados.add(r);
    return r;
  };

  const resultados = [];
  for (let i = 0; i < 9; i++) {
    resultados.push(i < cantidadGol ? unico(() => resultadoGol(nivel)) : unico(() => resultadoAtaja(nivel)));
  }

  estado.ronda = mezclar(resultados).map((r) => ({ r, op: construirOperacion(r, nivel) }));
}

// ---------- Dibujo ----------

function dibujarTiros() {
  const contenedor = $("tiros");
  contenedor.innerHTML = "";
  contenedor.classList.remove("revelado");
  celdas = [];

  estado.ronda.forEach((tiro, i) => {
    const boton = document.createElement("button");
    boton.className = "tiro";
    boton.setAttribute("aria-label", `Tiro ${i + 1}: ${tiro.op}`);
    boton.addEventListener("click", () => tirar(i));

    const op = document.createElement("span");
    op.className = "op";
    op.textContent = tiro.op;

    const res = document.createElement("span");
    res.className = "res";

    boton.appendChild(op);
    boton.appendChild(res);
    contenedor.appendChild(boton);
    celdas.push({ boton, op, res });
  });
}

function moverArquero(i) {
  const arquero = $("arquero");
  if (!arquero) return;

  if (i === null) {
    // posición de descanso, al medio del arco
    arquero.style.left = "50%";
    arquero.style.top = "62%";
    arquero.style.transform = "translate(-50%, -50%)";
    return;
  }

  const col = i % 3;
  const fila = Math.floor(i / 3);
  const giro = col === 0 ? -65 : col === 2 ? 65 : 0;

  arquero.style.left = `${((col + 0.5) / 3) * 100}%`;
  arquero.style.top = `${((fila + 0.5) / 3) * 100}%`;
  arquero.style.transform = `translate(-50%, -50%) rotate(${giro}deg)`;
}

function lanzarPelota(i) {
  const pelota = $("pelota");
  if (!pelota) return;

  const p = pelota.getBoundingClientRect();
  const c = celdas[i].boton.getBoundingClientRect();
  const dx = c.left + c.width / 2 - (p.left + p.width / 2);
  const dy = c.top + c.height / 2 - (p.top + p.height / 2);

  pelota.style.transform = `translate(${dx}px, ${dy}px) scale(0.55)`;
}

function reponerPelota() {
  const pelota = $("pelota");
  if (!pelota) return;

  pelota.style.transition = "none";
  pelota.style.transform = "";
  void pelota.offsetWidth; // fuerza el repintado antes de reactivar la animación
  pelota.style.transition = "";
}

function revelar(elegido) {
  $("tiros").classList.add("revelado");

  estado.ronda.forEach((tiro, i) => {
    const { boton, res } = celdas[i];
    res.textContent = `= ${tiro.r}%`;
    boton.classList.add(tiro.r > CONFIG.umbral ? "gol" : "ataja");
    boton.classList.toggle("elegido", i === elegido);
    boton.disabled = true;
  });
}

function actualizarPanel() {
  const nivel = nivelActual();
  const vidas = Math.max(estado.vidas, 0);

  escribir("nivel", `Nivel ${nivel} · ${rangoDe(nivel)}`);
  escribir("goles", `⚽ Goles: ${estado.goles}`);
  escribir("vidas", `Vidas: ${"❤️".repeat(vidas)}${"🖤".repeat(CONFIG.vidas - vidas)}`);
  escribir("record", `🏆 Récord: ${leerRecord()}`);
}

// ---------- Tiempo ----------

function mostrarTiempo() {
  const porcentaje = Math.max(0, estado.tiempo / estado.tiempoTotal) * 100;
  const barra = $("barraTiempo");

  if (barra) {
    barra.style.width = `${porcentaje}%`;
    barra.style.background = porcentaje < 30 ? "#e74c3c" : "#2ecc71";
  }
  escribir("tiempo", `⏱️ ${Math.ceil(Math.max(estado.tiempo, 0))} s`);
}

function detenerTemporizador() {
  if (estado.temporizador) {
    clearInterval(estado.temporizador);
    estado.temporizador = null;
  }
}

function iniciarTemporizador() {
  detenerTemporizador();
  estado.tiempoTotal = tiempoDeTiro(nivelActual());
  estado.tiempo = estado.tiempoTotal;
  mostrarTiempo();

  estado.temporizador = setInterval(() => {
    estado.tiempo -= 0.1;
    mostrarTiempo();
    if (estado.tiempo <= 0) resolver(null);
  }, 100);
}

// ---------- Flujo del juego ----------

function nuevoTiro() {
  estado.fase = "jugando";
  generarRonda();
  dibujarTiros();
  reponerPelota();
  moverArquero(null);
  iniciarTemporizador();

  const siguiente = $("btnSiguiente");
  if (siguiente) siguiente.hidden = true;
}

function nuevaPartida() {
  estado.goles = 0;
  estado.vidas = CONFIG.vidas;
  estado.recordPrevio = leerRecord();

  actualizarPanel();
  nuevoTiro();
  escribir("mensaje", "Elegí un tiro: resolvé la operación y fijate si supera el 50%.");
}

function siguiente() {
  if (estado.fase !== "resuelto") return;
  nuevoTiro();
  escribir("mensaje", "");
}

function tirar(i) {
  if (estado.fase !== "jugando") return;
  resolver(i);
}

// Si el tiro es gol, el arquero se tira para otro lado; si no, ataja justo ahí.
function otraCelda(i) {
  const otras = [];
  for (let k = 0; k < 9; k++) if (k !== i) otras.push(k);
  return elegir(otras);
}

function resolver(i) {
  detenerTemporizador();
  estado.fase = "resuelto";

  let mensaje;

  if (i === null) {
    // se acabó el tiempo
    moverArquero(aleatorio(0, 8));
    estado.vidas--;
    mensaje = "⏱️ ¡Se acabó el tiempo! Dudaste y el arquero te sacó la pelota.";
  } else {
    const r = estado.ronda[i].r;
    lanzarPelota(i);

    if (r > CONFIG.umbral) {
      const nivelAntes = nivelActual();
      estado.goles++;
      registrarRecord();
      moverArquero(otraCelda(i));
      mensaje = `⚽ ¡GOOOL! ${r}% supera el ${CONFIG.umbral}%. El arquero se tiró para el otro lado.`;

      const nivelDespues = nivelActual();
      if (nivelDespues !== nivelAntes) {
        mensaje += ` ⬆️ ¡Subiste a ${rangoDe(nivelDespues)}!`;
      }
    } else {
      moverArquero(i);
      estado.vidas--;
      mensaje = `🧤 ¡Atajó! ${r}% no supera el ${CONFIG.umbral}%.`;
    }
  }

  revelar(i);
  actualizarPanel();

  if (estado.vidas <= 0) {
    estado.fase = "terminado";
    mensaje += ` 🏁 Fin del partido: ${estado.goles} ${estado.goles === 1 ? "gol" : "goles"}.`;
    if (estado.goles > estado.recordPrevio) mensaje += " 🏆 ¡Nuevo récord!";
  } else {
    const siguiente = $("btnSiguiente");
    if (siguiente) siguiente.hidden = false;
  }

  escribir("mensaje", mensaje);
}

window.addEventListener("load", nuevaPartida);
