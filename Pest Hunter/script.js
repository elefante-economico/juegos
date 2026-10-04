// PEST HUNTER — encontrá las cucarachas antes de que invadan el tablero.

const CONFIG = {
  tamanoInicial: 6,   // el tablero crece con los niveles
  tamanoMax: 10,
  maxPlaga: 6,        // con tantas cucarachas vivas, perdés por infestación
  pasosHuida: 2,      // casillas que se mueve cada cucaracha por turno
  puntosBase: 10,
  bonoRapidez: 8,     // puntos extra si la cazás en pocos disparos
};

const estado = {
  nivel: 1,
  tam: CONFIG.tamanoInicial,
  cucarachas: [],     // [{ f, c }]
  marcas: {},         // "f,c" -> { tipo: "num", valor } | { tipo: "muerta" }
  ultimoTiro: null,
  turno: 0,
  tirosDesdeMuerte: 0,
  puntaje: 0,
  terminado: false,
  recordPrevio: 0,
};

let celdas = [];

const $ = (id) => document.getElementById(id);
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = (lista) => lista[aleatorio(0, lista.length - 1)];
const clave = (f, c) => `${f},${c}`;
const distancia = (a, b) => Math.abs(a.f - b.f) + Math.abs(a.c - b.c);
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

// Escribe texto en un elemento; si no existe en el HTML, lo ignora sin romper el juego.
const escribir = (id, texto) => {
  const el = $(id);
  if (el) el.textContent = texto;
};

// ---------- Récord (se guarda en el navegador) ----------

const CLAVE_RECORD = "pesthunter_record";

function leerRecord() {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0;
  } catch (e) {
    return 0;
  }
}

function registrarRecord() {
  if (estado.puntaje > leerRecord()) {
    try {
      localStorage.setItem(CLAVE_RECORD, String(estado.puntaje));
    } catch (e) {
      /* sin almacenamiento disponible: el juego sigue igual */
    }
  }
}

// ---------- Rangos ----------

// Cada 3 niveles cambia el título.
const RANGOS = [
  "Aprendiz de insecticida",
  "Cazador de bichos",
  "Exterminador profesional",
  "Fumigador legendario",
  "Terror de las alcantarillas",
  "Rey de la plaga",
];

const rangoDe = (nivel) =>
  RANGOS[Math.min(Math.floor((nivel - 1) / 3), RANGOS.length - 1)];

// ---------- Reglas del nivel ----------

const tamanoDe = (nivel) =>
  Math.min(CONFIG.tamanoInicial + Math.floor((nivel - 1) / 2), CONFIG.tamanoMax);

const cucarachasIniciales = (nivel) =>
  Math.min(1 + Math.floor((nivel - 1) / 2), CONFIG.maxPlaga - 2);

// Cada tantos turnos aparece una cucaracha nueva; baja a medida que subís de nivel.
const intervaloAparicion = (nivel) => Math.max(9 - Math.floor(nivel / 2), 5);

// ---------- Cucarachas ----------

function casillasLibres() {
  const ocupadas = new Set(estado.cucarachas.map((x) => clave(x.f, x.c)));
  const libres = [];
  for (let f = 0; f < estado.tam; f++) {
    for (let c = 0; c < estado.tam; c++) {
      if (!ocupadas.has(clave(f, c))) libres.push({ f, c });
    }
  }
  return libres;
}

function aparecerCucaracha() {
  const libres = casillasLibres();
  if (libres.length === 0) return false;
  estado.cucarachas.push(elegir(libres));
  return true;
}

// La cucaracha se mueve hasta 2 casillas, eligiendo la que más la aleja del disparo.
// Si está acorralada en una esquina, no tiene a dónde huir.
function huir(cuc, origen, ocupadas) {
  let mejor = -1;
  let opciones = [];

  for (let df = -CONFIG.pasosHuida; df <= CONFIG.pasosHuida; df++) {
    for (let dc = -CONFIG.pasosHuida; dc <= CONFIG.pasosHuida; dc++) {
      if (Math.abs(df) + Math.abs(dc) > CONFIG.pasosHuida) continue;

      const destino = { f: cuc.f + df, c: cuc.c + dc };
      if (destino.f < 0 || destino.c < 0 || destino.f >= estado.tam || destino.c >= estado.tam) continue;
      if ((df !== 0 || dc !== 0) && ocupadas.has(clave(destino.f, destino.c))) continue;

      const d = distancia(destino, origen);
      if (d > mejor) {
        mejor = d;
        opciones = [destino];
      } else if (d === mejor) {
        opciones.push(destino);
      }
    }
  }

  return elegir(opciones);
}

function moverCucarachas(origen) {
  const ocupadas = new Set(estado.cucarachas.map((x) => clave(x.f, x.c)));

  estado.cucarachas = estado.cucarachas.map((cuc) => {
    ocupadas.delete(clave(cuc.f, cuc.c));
    const nueva = huir(cuc, origen, ocupadas);
    ocupadas.add(clave(nueva.f, nueva.c));
    return nueva;
  });
}

const masCercana = (origen) =>
  Math.min(...estado.cucarachas.map((x) => distancia(x, origen)));

// ---------- Tablero ----------

function construirTablero() {
  const tablero = $("tablero");
  tablero.innerHTML = "";
  tablero.style.gridTemplateColumns = `repeat(${estado.tam}, 1fr)`;
  celdas = [];

  for (let f = 0; f < estado.tam; f++) {
    const fila = [];
    for (let c = 0; c < estado.tam; c++) {
      const boton = document.createElement("button");
      boton.className = "celda";
      boton.setAttribute("aria-label", `Fila ${f + 1}, columna ${c + 1}`);
      boton.addEventListener("click", () => disparar(f, c));
      tablero.appendChild(boton);
      fila.push(boton);
    }
    celdas.push(fila);
  }
}

function dibujar() {
  const vivas = new Set(estado.cucarachas.map((x) => clave(x.f, x.c)));
  const u = estado.ultimoTiro;

  for (let f = 0; f < estado.tam; f++) {
    for (let c = 0; c < estado.tam; c++) {
      const k = clave(f, c);
      const marca = estado.marcas[k];
      const esUltimo = !!u && u.f === f && u.c === c;
      const boton = celdas[f][c];

      let texto = "";
      let color = "";

      if (estado.terminado && vivas.has(k)) {
        texto = "🪳";
      } else if (marca && marca.tipo === "muerta") {
        texto = "💀";
      } else if (marca) {
        texto = String(marca.valor);
        // cerca = rojo, lejos = azul
        color = `hsl(${Math.min(marca.valor, 10) * 22}, 70%, 40%)`;
      }

      boton.textContent = texto;
      boton.style.color = color;
      boton.classList.toggle("ultimo", esUltimo);
      boton.classList.toggle("vieja", !!marca && !esUltimo);
      boton.disabled = estado.terminado;
    }
  }
}

function actualizarPanel() {
  const intervalo = intervaloAparicion(estado.nivel);
  const faltan = intervalo - (estado.turno % intervalo);

  escribir("nivel", `Nivel ${estado.nivel} · ${rangoDe(estado.nivel)}`);
  escribir("puntaje", `Puntaje: ${estado.puntaje}`);
  escribir("record", `🏆 Récord: ${leerRecord()}`);
  escribir("plaga", `🪳 Cucarachas: ${estado.cucarachas.length} / ${CONFIG.maxPlaga}`);
  escribir("proxima", `⏳ Nueva cucaracha en ${faltan} ${plural(faltan, "turno", "turnos")}`);

  const plaga = $("plaga");
  if (plaga) plaga.classList.toggle("peligro", estado.cucarachas.length >= CONFIG.maxPlaga - 1);
}

// ---------- Flujo del juego ----------

function iniciarNivel(mensajeExtra = "") {
  estado.tam = tamanoDe(estado.nivel);
  estado.cucarachas = [];
  estado.marcas = {};
  estado.ultimoTiro = null;
  estado.turno = 0;
  estado.tirosDesdeMuerte = 0;

  const cantidad = cucarachasIniciales(estado.nivel);
  for (let i = 0; i < cantidad; i++) aparecerCucaracha();

  construirTablero();
  dibujar();
  actualizarPanel();

  const base = `Tablero de ${estado.tam}×${estado.tam} con ${cantidad} ${plural(cantidad, "cucaracha", "cucarachas")}. ¡A cazar!`;
  escribir("mensaje", mensajeExtra ? `${mensajeExtra} ${base}` : base);
}

function nuevaPartida() {
  estado.nivel = 1;
  estado.puntaje = 0;
  estado.terminado = false;
  estado.recordPrevio = leerRecord();
  iniciarNivel();
}

function nivelSuperado() {
  const bono = 50 * estado.nivel;
  estado.puntaje += bono;
  registrarRecord();
  estado.nivel++;
  iniciarNivel(`🎉 ¡Nivel superado! +${bono} puntos.`);
}

function terminarPartida() {
  estado.terminado = true;
  dibujar();
  actualizarPanel();

  let mensaje = `☠️ ¡Infestación! Las cucarachas se apoderaron del lugar. Puntaje final: ${estado.puntaje}.`;
  if (estado.puntaje > estado.recordPrevio) mensaje += " 🏆 ¡Nuevo récord!";
  escribir("mensaje", mensaje);
}

function disparar(f, c) {
  if (estado.terminado) return;

  const tiro = { f, c };
  const k = clave(f, c);
  estado.ultimoTiro = tiro;
  estado.tirosDesdeMuerte++;

  let mensaje = "";
  const idx = estado.cucarachas.findIndex((x) => x.f === f && x.c === c);

  if (idx >= 0) {
    // Impacto
    estado.cucarachas.splice(idx, 1);
    const rapidez = Math.max(0, CONFIG.bonoRapidez - (estado.tirosDesdeMuerte - 1));
    const puntos = (CONFIG.puntosBase + rapidez) * estado.nivel;
    estado.puntaje += puntos;
    estado.tirosDesdeMuerte = 0;
    estado.marcas[k] = { tipo: "muerta" };
    registrarRecord();

    if (estado.cucarachas.length === 0) {
      nivelSuperado();
      return;
    }

    const d = masCercana(tiro);
    mensaje = `💥 ¡Cucaracha eliminada! +${puntos}. La más cercana está a ${d} ${plural(d, "casilla", "casillas")}.`;
  } else {
    // Fallo: el cazador se da vuelta y avisa a qué distancia está la más cercana
    const d = masCercana(tiro);
    estado.marcas[k] = { tipo: "num", valor: d };
    mensaje = `🔫 Fila ${f + 1}, columna ${c + 1}: la cucaracha más cercana está a ${d} ${plural(d, "casilla", "casillas")}.`;
  }

  // Las que sobrevivieron huyen del disparo
  moverCucarachas(tiro);
  estado.turno++;

  // Con el tiempo, aparecen más
  if (estado.turno % intervaloAparicion(estado.nivel) === 0 && aparecerCucaracha()) {
    mensaje += " 🪳 ¡Apareció una cucaracha nueva!";
  }

  if (estado.cucarachas.length >= CONFIG.maxPlaga) {
    terminarPartida();
    return;
  }

  dibujar();
  actualizarPanel();
  escribir("mensaje", mensaje);
}

window.addEventListener("load", nuevaPartida);
