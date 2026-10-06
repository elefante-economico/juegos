// SPEED ONE — llegá a la meta con el número exacto, transformándolo línea por línea.

const CONFIG = {
  niveles: 10,               // al superar el último circuito, sos campeón
  vidas: 3,
  limiteNumero: 999,         // ninguna operación puede pasarse de este valor
  pausaFallo: 1800,          // milisegundos antes de repetir el circuito tras un fallo
  penalizacionDeshacer: 5,   // puntos que resta cada "deshacer"
  penalizacionFallo: 30,     // puntos que resta cada llegada con el número equivocado
};

// Colores de las escuderías de F1 (principal + color de detalle).
// Podés retocar cualquier color acá.
const ESCUDERIAS = [
  { id: "ferrari",     nombre: "FER",       codigo: "FER", principal: "#DC0000", secundario: "#FFD800" },
  { id: "mclaren",     nombre: "MCL",       codigo: "MCL", principal: "#FF8000", secundario: "#0B5ED7" },
  { id: "mercedes",    nombre: "MAR",      codigo: "MER", principal: "#C8CCD0", secundario: "#00D2BE" },
  { id: "redbull",     nombre: "RBR",      codigo: "RBR", principal: "#1E2F8F", secundario: "#E8002D" },
  { id: "aston",       nombre: "AMR",  codigo: "AMR", principal: "#006F62", secundario: "#CEDC00" },
  { id: "alpine",      nombre: "ALP",        codigo: "ALP", principal: "#0093CC", secundario: "#FF87BC" },
  { id: "williams",    nombre: "WIL",      codigo: "WIL", principal: "#005AFF", secundario: "#FFFFFF" },
  { id: "racingbulls", nombre: "RB",  codigo: "RB",  principal: "#F4F6FF", secundario: "#2B4FFF" },
  { id: "haas",        nombre: "HAA",          codigo: "HAA", principal: "#F0F0F0", secundario: "#E10600" },
  { id: "audi",        nombre: "AUD",          codigo: "AUD", principal: "#B9BEC6", secundario: "#E3002B" },
  { id: "cadillac",    nombre: "CAD",      codigo: "CAD", principal: "#8E949C", secundario: "#161616" },
];

const estado = {
  nivel: 1,
  filas: 4,
  cols: 3,
  salida: 1,
  inicio: 0,
  meta: 0,
  celdas: [],          // celdas[fila][col] = { op: {tipo, n}, coche: null | { equipo } }
  ruta: [],            // una solución garantizada (solo para el diseño del circuito)
  fila: 0,             // 0 = parrilla de salida
  col: 0,
  actual: 0,
  historial: [],       // posiciones anteriores, para "deshacer"
  vidas: CONFIG.vidas,
  puntaje: 0,
  deshechos: 0,
  fallos: 0,
  fase: "jugando",     // "jugando" | "pausa" | "nivelSuperado" | "victoria" | "terminado"
  jugador: ESCUDERIAS[0] ? { ...ESCUDERIAS[0] } : null,
  recordPrevio: 0,
  token: 0,            // invalida pausas pendientes al reiniciar
  movido: false,       // para animar el último avance
};

let botonesColor = [];

const $ = (id) => document.getElementById(id);
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = (lista) => lista[aleatorio(0, lista.length - 1)];
const clave = (f, c) => `${f},${c}`;

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

// ---------- Récord y color elegido (se guardan en el navegador) ----------

const CLAVE_RECORD = "speedone_record";
const CLAVE_COLOR = "speedone_color";

function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch (e) {
    return null;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, String(valor));
  } catch (e) {
    /* sin almacenamiento disponible: el juego sigue igual */
  }
}

const leerRecord = () => Number(leer(CLAVE_RECORD)) || 0;

function registrarRecord() {
  if (estado.nivel > leerRecord()) guardar(CLAVE_RECORD, estado.nivel);
}

// ---------- Rangos (uno por circuito) ----------

const RANGOS = [
  "Karting dominguero",
  "Piloto de pruebas",
  "Debutante de F2",
  "Novato en la parrilla",
  "Cazador de poles",
  "Rey del DRS",
  "Estratega de boxes",
  "Pole position fija",
  "Campeón del mundo",
  "Leyenda de Speed One",
];

const rangoDe = (nivel) => RANGOS[Math.min(nivel - 1, RANGOS.length - 1)];

// ---------- Operaciones ----------

// Devuelve el nuevo número, o null si la operación no se puede hacer
// (división inexacta, resultado menor que 1 o mayor que el límite).
function aplicar(op, v) {
  let r = null;
  if (op.tipo === "+") r = v + op.n;
  else if (op.tipo === "−") r = v - op.n;
  else if (op.tipo === "×") r = v * op.n;
  else if (op.tipo === "÷") r = v % op.n === 0 ? v / op.n : null;

  return r !== null && Number.isInteger(r) && r >= 1 && r <= CONFIG.limiteNumero ? r : null;
}

const textoOp = (op) => `${op.tipo}${op.n}`;
const claseOp = (op) => ({ "+": "mas", "−": "menos", "×": "por", "÷": "div" }[op.tipo]);

const maxSuma = (n) => 4 + n * 2;
const maxMult = (n) => (n <= 2 ? 3 : n <= 4 ? 4 : n <= 6 ? 5 : 6);
const tiposPermitidos = (n) => (n === 1 ? ["+", "−"] : n === 2 ? ["+", "−", "×"] : ["+", "−", "×", "÷"]);

// Una operación que sí se puede hacer sobre el número "v" (para la ruta ganadora).
function opValida(v, nivel) {
  for (const tipo of mezclar(tiposPermitidos(nivel))) {
    let n;

    if (tipo === "+") {
      n = aleatorio(1, maxSuma(nivel));
    } else if (tipo === "−") {
      if (v <= 1) continue;
      n = aleatorio(1, Math.min(maxSuma(nivel), v - 1));
    } else if (tipo === "×") {
      n = aleatorio(2, maxMult(nivel));
      if (v * n > 400) continue;
    } else {
      const divisores = [2, 3, 4, 5, 6, 7, 8, 9].filter((d) => v % d === 0);
      if (divisores.length === 0) continue;
      n = elegir(divisores);
    }

    const op = { tipo, n };
    const res = aplicar(op, v);
    if (res !== null) return { op, res };
  }

  const op = { tipo: "−", n: 1 };
  return { op, res: aplicar(op, v) ?? v + 1 };
}

// Una operación cualquiera para las casillas que no son de la ruta ganadora.
function opAleatoria(nivel) {
  const tipo = elegir(tiposPermitidos(nivel));
  if (tipo === "×") return { tipo, n: aleatorio(2, maxMult(nivel)) };
  if (tipo === "÷") return { tipo, n: elegir([2, 3, 4, 5]) };
  return { tipo, n: aleatorio(1, maxSuma(nivel)) };
}

// ---------- Circuito ----------

const filasDe = (nivel) => Math.min(3 + nivel, 10);
const columnasDe = (nivel) => (nivel <= 2 ? 3 : nivel <= 5 ? 4 : 5);
const probCoche = (nivel) => Math.min(0.12 + 0.03 * nivel, 0.35);

function generarCircuito() {
  const nivel = estado.nivel;
  const filas = filasDe(nivel);
  const cols = columnasDe(nivel);
  const salida = Math.floor(cols / 2);

  let inicio, meta, ruta;

  // Se arma primero una ruta ganadora, así el circuito siempre tiene solución.
  do {
    inicio = aleatorio(2, 8 + nivel);
    let valor = inicio;
    let col = salida;
    ruta = [];

    for (let f = 1; f <= filas; f++) {
      col = elegir([col - 1, col, col + 1].filter((x) => x >= 0 && x < cols));
      const { op, res } = opValida(valor, nivel);
      ruta.push({ fila: f, col, op });
      valor = res;
    }
    meta = valor;
  } while (meta === inicio);

  const celdas = [null];
  for (let f = 1; f <= filas; f++) {
    const fila = [];
    for (let c = 0; c < cols; c++) {
      const enRuta = ruta[f - 1].col === c;
      const coche = !enRuta && Math.random() < probCoche(nivel) ? { equipo: null } : null;
      fila.push({ op: enRuta ? ruta[f - 1].op : opAleatoria(nivel), coche });
    }
    celdas.push(fila);
  }

  Object.assign(estado, { filas, cols, salida, inicio, meta, celdas, ruta });
  asignarEquipos();
}

// Los rivales usan los colores de las escuderías, salvo la que eligió el jugador.
function asignarEquipos() {
  const rivales = ESCUDERIAS.filter((e) => e.id !== estado.jugador.id);
  let cola = [];

  for (let f = 1; f <= estado.filas; f++) {
    for (let c = 0; c < estado.cols; c++) {
      const coche = estado.celdas[f][c].coche;
      if (!coche) continue;
      if (cola.length === 0) cola = mezclar(rivales.slice());
      coche.equipo = cola.pop();
    }
  }
}

function alcanzable(f, c) {
  if (estado.fase !== "jugando") return false;
  if (f !== estado.fila + 1 || f > estado.filas) return false;
  if (c < 0 || c >= estado.cols || Math.abs(c - estado.col) > 1) return false;

  const celda = estado.celdas[f][c];
  return !celda.coche && aplicar(celda.op, estado.actual) !== null;
}

const opcionesDisponibles = () => {
  let total = 0;
  for (let c = 0; c < estado.cols; c++) if (alcanzable(estado.fila + 1, c)) total++;
  return total;
};

// ---------- Autos (dibujo) ----------

function svgAuto(principal, secundario) {
  return `<svg viewBox="0 0 40 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="5" y="2" width="30" height="5" rx="1.5" fill="${secundario}" stroke="rgba(255,255,255,.55)" stroke-width=".6"/>
    <rect x="3" y="14" width="8" height="15" rx="2" fill="#111" stroke="rgba(255,255,255,.35)" stroke-width=".5"/>
    <rect x="29" y="14" width="8" height="15" rx="2" fill="#111" stroke="rgba(255,255,255,.35)" stroke-width=".5"/>
    <rect x="1.5" y="50" width="9.5" height="17" rx="2.5" fill="#111" stroke="rgba(255,255,255,.35)" stroke-width=".5"/>
    <rect x="29" y="50" width="9.5" height="17" rx="2.5" fill="#111" stroke="rgba(255,255,255,.35)" stroke-width=".5"/>
    <path d="M17 7 L23 7 L24 27 L16 27 Z" fill="${principal}" stroke="rgba(255,255,255,.5)" stroke-width=".6"/>
    <path d="M15 26 L25 26 L30 44 L28 64 L12 64 L10 44 Z" fill="${principal}" stroke="rgba(255,255,255,.5)" stroke-width=".6"/>
    <rect x="18.5" y="8" width="3" height="56" fill="${secundario}" opacity=".9"/>
    <ellipse cx="20" cy="42" rx="4.2" ry="6.2" fill="#0b0b0b"/>
    <circle cx="20" cy="41" r="2.6" fill="${secundario}"/>
    <rect x="7" y="68" width="26" height="7" rx="1.5" fill="${secundario}" stroke="rgba(255,255,255,.55)" stroke-width=".6"/>
  </svg>`;
}

function crearAuto(principal, secundario, clase) {
  const auto = crear("span", `auto ${clase}`);
  auto.innerHTML = svgAuto(principal, secundario);
  return auto;
}

// ---------- Dibujo de la pista ----------

function crearCelda(f, c) {
  const esJugador = estado.fila === f && estado.col === c;
  const celda = f > 0 ? estado.celdas[f][c] : null;
  const alc = alcanzable(f, c);

  const clases = ["celda"];
  if (alc) clases.push("alcanzable");
  if (f <= estado.fila && !esJugador) clases.push("pasada");
  if (estado.historial.some((h) => h.fila === f && h.col === c && f > 0)) clases.push("huella");
  if (f === estado.fila + 1 && celda && !celda.coche && aplicar(celda.op, estado.actual) === null) {
    clases.push("invalida");
  }

  const boton = crear("button", clases.join(" "));
  boton.disabled = !alc;
  if (alc) boton.addEventListener("click", () => mover(c));

  if (esJugador) {
    const auto = crearAuto(
      estado.jugador.principal,
      estado.jugador.secundario,
      `jugador${estado.movido ? " recien" : ""}`
    );
    boton.appendChild(auto);
    boton.appendChild(crear("span", "badge", String(estado.actual)));
    boton.setAttribute("aria-label", `Tu auto, número ${estado.actual}`);
  } else if (celda && celda.coche) {
    const eq = celda.coche.equipo;
    boton.title = eq.nombre;
    boton.appendChild(crearAuto(eq.principal, eq.secundario, "rival"));
    boton.appendChild(crear("span", "codigo", eq.codigo));
    boton.setAttribute("aria-label", `Auto rival de ${eq.nombre}`);
  } else if (celda) {
    boton.appendChild(crear("span", `op ${claseOp(celda.op)}`, textoOp(celda.op)));
    boton.setAttribute("aria-label", `Línea ${f}, carril ${c + 1}: ${textoOp(celda.op)}`);
  } else {
    boton.appendChild(crear("span", "etiqueta-salida", "SALIDA"));
  }

  return boton;
}

function dibujarPista() {
  const pista = $("pista");
  pista.innerHTML = "";

  const meta = crear("div", "meta");
  meta.appendChild(crear("span", "", `🏁 META · número final ${estado.meta}`));
  pista.appendChild(meta);

  for (let f = estado.filas; f >= 0; f--) {
    const linea = crear("div", f === 0 ? "linea salida" : "linea");
    linea.style.gridTemplateColumns = `repeat(${estado.cols}, 1fr)`;
    for (let c = 0; c < estado.cols; c++) linea.appendChild(crearCelda(f, c));
    pista.appendChild(linea);
  }
}

function actualizarPanel() {
  const vidas = Math.max(estado.vidas, 0);

  escribir("nivel", `Circuito ${estado.nivel} · ${rangoDe(estado.nivel)}`);
  escribir("linea", estado.fila === 0 ? "En la parrilla" : `Línea ${estado.fila} de ${estado.filas}`);
  escribir("vidas", `Vidas: ${"❤️".repeat(vidas)}${"🖤".repeat(CONFIG.vidas - vidas)}`);
  escribir("puntaje", `Puntaje: ${estado.puntaje}`);
  escribir("record", `🏆 Mejor circuito: ${leerRecord()}`);
  escribir("tuNumero", String(estado.actual));
  escribir("numeroMeta", String(estado.meta));
}

function redibujar() {
  dibujarPista();
  actualizarPanel();
}

function mostrarBotonSiguiente(visible) {
  const boton = $("btnSiguiente");
  if (boton) boton.hidden = !visible;
}

// ---------- Elegir el color del auto ----------

function contraste(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
}

function marcarColorElegido() {
  botonesColor.forEach(({ id, boton }) => {
    boton.className = estado.jugador.id === id ? "color elegido" : "color";
  });
  escribir("nombreAuto", `Tu auto: ${estado.jugador.nombre}`);

  const picker = $("colorPropio");
  if (picker) picker.value = estado.jugador.principal.toLowerCase();
}

function elegirEscuderia(id) {
  const equipo = ESCUDERIAS.find((e) => e.id === id);
  if (!equipo) return;

  estado.jugador = { ...equipo };
  guardar(CLAVE_COLOR, id);
  estado.movido = false;
  asignarEquipos();
  marcarColorElegido();
  dibujarPista();
}

function elegirColorPropio(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;

  estado.jugador = {
    id: null,
    nombre: "color personalizado",
    codigo: "TÚ",
    principal: hex,
    secundario: contraste(hex),
  };
  guardar(CLAVE_COLOR, hex);
  estado.movido = false;
  asignarEquipos();
  marcarColorElegido();
  dibujarPista();
}

function construirGaraje() {
  const contenedor = $("colores");
  if (!contenedor) return;

  contenedor.innerHTML = "";
  botonesColor = [];

  ESCUDERIAS.forEach((e) => {
    const boton = crear("button", "color");
    boton.title = e.nombre;
    boton.setAttribute("aria-label", `Elegir auto ${e.nombre}`);
    boton.style.background = `linear-gradient(135deg, ${e.principal} 50%, ${e.secundario} 50%)`;
    boton.addEventListener("click", () => elegirEscuderia(e.id));
    contenedor.appendChild(boton);
    botonesColor.push({ id: e.id, boton });
  });

  const picker = $("colorPropio");
  if (picker) picker.addEventListener("input", (e) => elegirColorPropio(e.target.value));
}

function cargarColorGuardado() {
  const guardado = leer(CLAVE_COLOR);
  if (!guardado) return;

  const equipo = ESCUDERIAS.find((e) => e.id === guardado);
  if (equipo) {
    estado.jugador = { ...equipo };
  } else if (/^#[0-9a-f]{6}$/i.test(guardado)) {
    estado.jugador = {
      id: null,
      nombre: "color personalizado",
      codigo: "TÚ",
      principal: guardado,
      secundario: contraste(guardado),
    };
  }
}

// ---------- Flujo del juego ----------

function posicionDeSalida(mensaje) {
  estado.fila = 0;
  estado.col = estado.salida;
  estado.actual = estado.inicio;
  estado.historial = [];
  estado.movido = false;
  estado.fase = "jugando";
  redibujar();
  escribir("mensaje", mensaje);
}

function iniciarNivel() {
  estado.deshechos = 0;
  estado.fallos = 0;
  registrarRecord();
  mostrarBotonSiguiente(false);
  generarCircuito();

  posicionDeSalida(
    `Circuito ${estado.nivel}: ${estado.filas} líneas y ${estado.cols} carriles. ` +
      `Pasá de ${estado.inicio} a ${estado.meta} sin chocar.`
  );
}

function nuevaPartida() {
  estado.token++;
  estado.nivel = 1;
  estado.vidas = CONFIG.vidas;
  estado.puntaje = 0;
  estado.recordPrevio = leerRecord();
  iniciarNivel();
}

function siguienteNivel() {
  if (estado.fase !== "nivelSuperado") return;
  estado.nivel++;
  iniciarNivel();
}

function reiniciarCircuito() {
  if (estado.fase === "nivelSuperado" || estado.fase === "victoria" || estado.fase === "terminado") return;
  estado.token++;
  posicionDeSalida("Circuito reiniciado desde la parrilla.");
}

function deshacer() {
  if (estado.fase !== "jugando" || estado.historial.length === 0) return;

  const anterior = estado.historial.pop();
  estado.fila = anterior.fila;
  estado.col = anterior.col;
  estado.actual = anterior.valor;
  estado.deshechos++;
  estado.movido = false;
  redibujar();
  escribir("mensaje", "");
}

function mover(c) {
  if (!alcanzable(estado.fila + 1, c)) return;

  const f = estado.fila + 1;
  estado.historial.push({ fila: estado.fila, col: estado.col, valor: estado.actual });
  estado.actual = aplicar(estado.celdas[f][c].op, estado.actual);
  estado.fila = f;
  estado.col = c;
  estado.movido = true;

  if (f === estado.filas) {
    llegadaAMeta();
    return;
  }

  redibujar();

  if (opcionesDisponibles() === 0) {
    escribir("mensaje", "🚧 Sin salida: los rivales o las operaciones te cierran el paso. Usá «Deshacer».");
  } else {
    escribir("mensaje", "");
  }
}

function llegadaAMeta() {
  let mensaje;

  if (estado.actual === estado.meta) {
    const base = 100 - CONFIG.penalizacionDeshacer * estado.deshechos - CONFIG.penalizacionFallo * estado.fallos;
    const puntos = Math.max(20, base) * estado.nivel;
    estado.puntaje += puntos;

    if (estado.nivel >= CONFIG.niveles) {
      estado.fase = "victoria";
      registrarRecord();
      mensaje = `🏆 ¡Bandera a cuadros y campeonato del mundo! Terminaste con ${estado.puntaje} puntos.`;
    } else {
      estado.fase = "nivelSuperado";
      mostrarBotonSiguiente(true);
      mensaje = `🏁 ¡Bandera a cuadros! Llegaste con ${estado.meta}. +${puntos} puntos.`;
    }
  } else {
    estado.vidas--;
    estado.fallos++;
    mensaje = `💥 Cruzaste la meta con ${estado.actual}, pero el número final era ${estado.meta}. Perdés una vida.`;

    if (estado.vidas <= 0) {
      estado.fase = "terminado";
      mensaje += " 🛑 Te quedaste sin vidas: fin de la carrera.";
      if (estado.nivel > estado.recordPrevio) mensaje += " 🏆 ¡Nuevo récord!";
    } else {
      estado.fase = "pausa";
      programar(() => posicionDeSalida("Mismo circuito, ¡otra oportunidad!"), CONFIG.pausaFallo);
    }
  }

  redibujar();
  escribir("mensaje", mensaje);
}

// ---------- Teclado ----------

function alPresionarTecla(e) {
  if (e.target && e.target.tagName === "INPUT") return;

  const desplazamiento = { ArrowLeft: -1, ArrowUp: 0, ArrowRight: 1 }[e.key];
  if (desplazamiento === undefined) return;

  e.preventDefault();
  mover(estado.col + desplazamiento);
}

function iniciar() {
  cargarColorGuardado();
  construirGaraje();
  marcarColorElegido();
  document.addEventListener("keydown", alPresionarTecla);
  nuevaPartida();
}

window.addEventListener("load", iniciar);
