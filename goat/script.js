// ENCONTRAR AL GOAT — en cada piso, abrí la puerta con el resultado correcto.

const CONFIG = {
  niveles: 10,          // al superar el último, ganás el juego
  pisosIniciales: 3,    // pisos del nivel 1; cada nivel suma uno
  pisosMax: 10,
  vidas: 3,             // por nivel
  pausaAcierto: 1100,   // milisegundos antes de subir de piso
  pausaError: 1700,     // milisegundos antes de caer de piso
};

const estado = {
  nivel: 1,
  pisos: CONFIG.pisosIniciales,
  piso: 1,
  vidas: CONFIG.vidas,
  formula: { texto: "", valor: 0 },
  puertas: [],          // 3 resultados posibles
  correcta: 0,          // índice de la puerta con la cabra
  abierta: null,        // índice de la puerta abierta
  contenido: "",
  fase: "jugando",      // "jugando" | "pausa" | "nivelSuperado" | "victoria" | "terminado"
  recordPrevio: 0,
  token: 0,             // invalida pausas pendientes al reiniciar
};

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

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Ejecuta algo tras una pausa, salvo que mientras tanto se haya reiniciado el juego.
function programar(fn, ms) {
  const token = estado.token;
  setTimeout(() => {
    if (token === estado.token) fn();
  }, ms);
}

// ---------- Récord (se guarda en el navegador) ----------

const CLAVE_RECORD = "goat_record";

function leerRecord() {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0;
  } catch (e) {
    return 0;
  }
}

function registrarRecord() {
  if (estado.nivel > leerRecord()) {
    try {
      localStorage.setItem(CLAVE_RECORD, String(estado.nivel));
    } catch (e) {
      /* sin almacenamiento disponible: el juego sigue igual */
    }
  }
}

// ---------- Rangos (uno por nivel) ----------

const RANGOS = [
  "Botones novato",
  "Recepcionista distraído",
  "Botones con propina",
  "Conserje sospechoso",
  "Detective de pasillos",
  "Inspector de minibares",
  "Gerente nocturno",
  "Cazador de cabras",
  "Pastor de hoteles",
  "Maestro del GOAT",
];

const rangoDe = (nivel) => RANGOS[Math.min(nivel - 1, RANGOS.length - 1)];
const pisosDe = (nivel) =>
  Math.min(CONFIG.pisosIniciales + nivel - 1, CONFIG.pisosMax);

// ---------- Fórmulas ----------

// Magnitud de los números: crece con el nivel.
const mag = (n) => 12 + n * 8;

// "desde" es el primer nivel en que puede aparecer cada tipo de fórmula.
const GENERADORES = [
  { desde: 1, gen: (n) => { const a = aleatorio(2, mag(n)), b = aleatorio(2, mag(n)); return [`${a} + ${b}`, a + b]; } },
  { desde: 1, gen: (n) => { const a = aleatorio(6, mag(n) + 20), b = aleatorio(2, a - 1); return [`${a} − ${b}`, a - b]; } },
  { desde: 2, gen: (n) => { const t = Math.min(5 + n, 15); const a = aleatorio(2, t), b = aleatorio(2, t); return [`${a} × ${b}`, a * b]; } },
  { desde: 3, gen: (n) => { const b = aleatorio(2, 9), q = aleatorio(2, Math.min(5 + n, 15)); return [`${b * q} ÷ ${b}`, q]; } },
  { desde: 4, gen: (n) => { const a = aleatorio(5, mag(n)), b = aleatorio(5, mag(n)), c = aleatorio(2, a + b - 1); return [`${a} + ${b} − ${c}`, a + b - c]; } },
  { desde: 5, gen: (n) => { const a = aleatorio(2, 9), b = aleatorio(2, 9), c = aleatorio(2, mag(n)); return [`${a} × ${b} + ${c}`, a * b + c]; } },
  { desde: 6, gen: (n) => { const t = Math.floor(mag(n) / 2); const a = aleatorio(2, t), b = aleatorio(2, t), c = aleatorio(2, 9); return [`(${a} + ${b}) × ${c}`, (a + b) * c]; } },
  { desde: 7, gen: (n) => { const a = aleatorio(10, mag(n)), b = aleatorio(1, a - 1), c = aleatorio(2, 9); return [`(${a} − ${b}) × ${c}`, (a - b) * c]; } },
  {
    desde: 8,
    gen: () => {
      let a, b, c, d;
      do {
        a = aleatorio(2, 9); b = aleatorio(2, 9); c = aleatorio(2, 9); d = aleatorio(2, 9);
      } while (a * b <= c * d);
      return [`${a} × ${b} − ${c} × ${d}`, a * b - c * d];
    },
  },
  { desde: 9, gen: (n) => { const a = aleatorio(3, 12), b = aleatorio(2, mag(n)); return [`${a}² + ${b}`, a * a + b]; } },
];

function generarFormula(nivel) {
  // Los tipos nuevos pesan más, así cada nivel se siente distinto.
  const pool = [];
  GENERADORES.filter((g) => g.desde <= nivel).forEach((g) => {
    const peso = g.desde > nivel - 4 ? 3 : 1;
    for (let k = 0; k < peso; k++) pool.push(g);
  });

  for (let intento = 0; intento < 100; intento++) {
    const [texto, valor] = elegir(pool).gen(nivel);
    if (valor >= 2 && valor <= 999) return { texto, valor };
  }
  return { texto: "7 + 8", valor: 15 };
}

// ---------- Resultados parecidos ----------

// Nivel bajo: respuestas falsas lejanas. Nivel alto: diferencias de 1 o 2,
// de 10, cifras invertidas o cambio de unidades.
function distractores(r, nivel) {
  let pool = [];
  const sumar = (...ds) => ds.forEach((d) => pool.push(r + d, r - d));

  if (nivel <= 2) {
    for (let d = 5; d <= 15; d++) sumar(d);
  } else if (nivel <= 4) {
    for (let d = 2; d <= 9; d++) sumar(d);
    sumar(10);
  } else if (nivel <= 7) {
    sumar(1, 2, 3, 5, 10);
  } else {
    sumar(1, 1, 2, 2, 10);
  }

  if (nivel >= 6) {
    // cifras invertidas (solo si quedan cerca) y cambios en la cifra de las unidades
    const invertido = Number(String(r).split("").reverse().join(""));
    if (Math.abs(invertido - r) <= 40) pool.push(invertido);
    const decena = r - (r % 10);
    for (let u = 0; u < 10; u++) {
      if (Math.abs(decena + u - r) <= 3) pool.push(decena + u);
    }
  }

  pool = [...new Set(pool)].filter((x) => x >= 1 && x !== r);
  for (let d = 1; pool.length < 2; d++) pool.push(r + d);

  const primero = elegir(pool);
  const segundo = elegir(pool.filter((x) => x !== primero));
  return [primero, segundo];
}

function generarPiso() {
  estado.formula = generarFormula(estado.nivel);
  const r = estado.formula.valor;
  estado.puertas = mezclar([r, ...distractores(r, estado.nivel)]);
  estado.correcta = estado.puertas.indexOf(r);
  estado.abierta = null;
  estado.contenido = "";
}

// ---------- Dibujo ----------

function filaActiva(p) {
  const fila = crear("div", "piso activo");
  fila.appendChild(crear("div", "etiqueta", `Piso ${p}`));
  fila.appendChild(crear("div", "formula", `${estado.formula.texto} = ?`));

  const puertas = crear("div", "puertas");
  estado.puertas.forEach((valor, i) => {
    const abierta = estado.abierta === i;
    const clases = ["puerta"];
    if (abierta) clases.push("abierta", i === estado.correcta ? "acierto" : "fallo");

    const boton = crear("button", clases.join(" "));
    boton.setAttribute("aria-label", `Puerta ${i + 1}: ${valor}`);
    boton.disabled = estado.fase !== "jugando";
    boton.addEventListener("click", () => abrir(i));

    boton.appendChild(crear("span", "placa", String(valor)));
    boton.appendChild(crear("span", "dentro", abierta ? estado.contenido : ""));
    puertas.appendChild(boton);
  });

  fila.appendChild(puertas);
  return fila;
}

function dibujarHotel() {
  const hotel = $("hotel");
  hotel.innerHTML = "";
  hotel.appendChild(crear("div", "techo", "🏨 HOTEL GOAT"));

  for (let p = estado.pisos; p >= 1; p--) {
    if (p === estado.piso) {
      hotel.appendChild(filaActiva(p));
      continue;
    }

    // Pisos de abajo: ya encontraste la cabra. Pisos de arriba: todavía a oscuras.
    const superado = p < estado.piso;
    const fila = crear("div", `piso ${superado ? "superado" : "pendiente"}`);
    fila.appendChild(crear("span", "numero", `P${p}`));

    const ventanas = crear("div", "ventanas");
    for (let k = 0; k < 3; k++) {
      ventanas.appendChild(crear("span", "ventana", superado && k === 1 ? "🐐" : ""));
    }
    fila.appendChild(ventanas);
    hotel.appendChild(fila);
  }
}

function actualizarPanel() {
  const vidas = Math.max(estado.vidas, 0);

  escribir("nivel", `Nivel ${estado.nivel} · ${rangoDe(estado.nivel)}`);
  escribir(
    "piso",
    estado.piso > estado.pisos ? "🌙 ¡Azotea!" : `🏨 Piso ${estado.piso} de ${estado.pisos}`
  );
  escribir("vidas", `Vidas: ${"❤️".repeat(vidas)}${"🖤".repeat(CONFIG.vidas - vidas)}`);
  escribir("record", `🏆 Mejor nivel: ${leerRecord()}`);
}

function mostrarBotonSiguiente(visible) {
  const boton = $("btnSiguiente");
  if (boton) boton.hidden = !visible;
}

// ---------- Flujo del juego ----------

const HUESPEDES = [
  { emoji: "😴", texto: "Un huésped dormía y te echó con la almohada" },
  { emoji: "🧹", texto: "Era el cuarto de limpieza" },
  { emoji: "👻", texto: "Había un fantasma, ¡qué susto!" },
  { emoji: "🐀", texto: "Una rata se llevó tu sándwich" },
  { emoji: "🧳", texto: "Solo había valijas olvidadas" },
  { emoji: "🛁", texto: "Era un baño... ocupado" },
  { emoji: "🦇", texto: "Un murciélago te despeinó" },
];

function nuevoPiso() {
  estado.fase = "jugando";
  generarPiso();
  dibujarHotel();
  actualizarPanel();
}

function iniciarNivel() {
  estado.pisos = pisosDe(estado.nivel);
  estado.piso = 1;
  estado.vidas = CONFIG.vidas;

  registrarRecord();
  mostrarBotonSiguiente(false);
  nuevoPiso();

  escribir(
    "mensaje",
    `Nivel ${estado.nivel}: ${estado.pisos} pisos. ¡Encontrá la cabra en cada uno!`
  );
}

function nuevaPartida() {
  estado.token++;
  estado.nivel = 1;
  estado.recordPrevio = leerRecord();
  iniciarNivel();
}

function siguienteNivel() {
  if (estado.fase !== "nivelSuperado") return;
  estado.nivel++;
  iniciarNivel();
}

function subir() {
  if (estado.piso >= estado.pisos) {
    nivelCompletado();
    return;
  }
  estado.piso++;
  nuevoPiso();
  escribir("mensaje", "");
}

function caer() {
  estado.piso = Math.max(1, estado.piso - 1);
  nuevoPiso();
  escribir("mensaje", `Estás en el piso ${estado.piso}. ¡Nueva fórmula!`);
}

function nivelCompletado() {
  estado.piso = estado.pisos + 1; // todos los pisos quedan encendidos
  estado.abierta = null;

  if (estado.nivel >= CONFIG.niveles) {
    estado.fase = "victoria";
    registrarRecord();
    escribir("mensaje", "🏆🐐 ¡Llegaste a la azotea y encontraste al GOAT supremo! ¡Ganaste el juego!");
  } else {
    estado.fase = "nivelSuperado";
    mostrarBotonSiguiente(true);
    escribir("mensaje", `🌙 ¡Nivel ${estado.nivel} superado! Llegaste a la azotea.`);
  }

  dibujarHotel();
  actualizarPanel();
}

function abrir(i) {
  if (estado.fase !== "jugando") return;

  estado.fase = "pausa";
  estado.abierta = i;
  const { texto, valor } = estado.formula;
  let mensaje;

  if (i === estado.correcta) {
    estado.contenido = "🐐";
    mensaje = `🐐 ¡Ahí estaba la cabra! ${texto} = ${valor}.`;
    programar(subir, CONFIG.pausaAcierto);
  } else {
    const huesped = elegir(HUESPEDES);
    estado.contenido = huesped.emoji;
    estado.vidas--;

    const cae = estado.piso > 1;
    mensaje = `${huesped.emoji} ${huesped.texto}. ${texto} = ${valor}. Perdés una vida${cae ? " y caés un piso" : ""}.`;

    if (estado.vidas <= 0) {
      estado.fase = "terminado";
      mensaje += ` 💀 Te quedaste sin vidas en el nivel ${estado.nivel}. ¡La cabra se rió de vos!`;
      if (estado.nivel > estado.recordPrevio) mensaje += " 🏆 ¡Nuevo récord!";
    } else {
      programar(caer, CONFIG.pausaError);
    }
  }

  dibujarHotel();
  actualizarPanel();
  escribir("mensaje", mensaje);
}

window.addEventListener("load", nuevaPartida);
