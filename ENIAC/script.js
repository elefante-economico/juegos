// ENIAC — deducí el número inicial deshaciendo las operaciones.

const CONFIG = {
  tiempoInicial: 60,       // segundos al empezar en modo contrarreloj
  bonoAcierto: 60,         // segundos que suma cada acierto
  penalizacionError: 5,    // segundos que resta cada error
  limiteNumero: 100000,    // tope para que los números no se disparen
  costoPista: 3,           // puntos que resta cada pista al ganar el nivel
};

const estado = {
  solucion: 0,
  valores: [],             // valores[0] = número inicial ... último = resultado final
  nivel: 1,
  puntaje: 0,
  intentos: 0,
  pistas: 0,
  modo: "libre",           // "libre" | "reloj"
  tiempo: 0,
  terminado: false,
  temporizador: null,
  recordPrevio: 0,
};

const $ = (id) => document.getElementById(id);
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Escribe texto en un elemento; si no existe en el HTML, lo ignora sin romper el juego.
const escribir = (id, texto) => {
  const el = $(id);
  if (el) el.textContent = texto;
};

const habilitar = (ids, activo) => {
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !activo;
  });
};

// ---------- Récord (se guarda en el navegador) ----------

const claveRecord = () => `eniac_record_${estado.modo}`;

function leerRecord() {
  try {
    return Number(localStorage.getItem(claveRecord())) || 0;
  } catch (e) {
    return 0;
  }
}

function guardarRecord(valor) {
  try {
    localStorage.setItem(claveRecord(), String(valor));
  } catch (e) {
    /* sin almacenamiento disponible: el juego sigue igual */
  }
}

function registrarRecord() {
  if (estado.puntaje > leerRecord()) guardarRecord(estado.puntaje);
}

function mostrarRecord() {
  const nombre = estado.modo === "reloj" ? "contrarreloj" : "libre";
  escribir("record", `🏆 Récord (${nombre}): ${leerRecord()}`);
}

// ---------- Rangos ----------

// Rangos de 5 niveles cada uno; el último título se mantiene para siempre.
const RANGOS = [
  "Principiante (todavía contás con los dedos)",
  "Universitario (el café ya es tu sangre)",
  "Maestro (tus alumnos te temen)",
  "Doctorado (tesis eternamente en curso)",
  "Premio Nobel (discurso de 40 minutos)",
  "Oráculo de Delfos (sin Wi-Fi)",
  "Válvula de vacío viviente (18.000 tubos y contando)",
];

const rangoDe = (nivel) =>
  RANGOS[Math.min(Math.floor((nivel - 1) / 5), RANGOS.length - 1)];

// ---------- Operaciones ----------

// Todas son reversibles con un único resultado posible, y solo se aplican
// si el resultado sigue siendo un entero positivo.
// (El módulo no se incluye: distintos números iniciales darían el mismo resultado.)
const esCuadrado = (x) => Number.isInteger(Math.sqrt(x));

const OPERACIONES = [
  {
    nivelMin: 1,
    simbolo: (n) => `+${n}`,
    param: () => aleatorio(1, 10),
    aplicable: () => true,
    aplicar: (x, n) => x + n,
  },
  {
    nivelMin: 1,
    simbolo: (n) => `−${n}`,
    param: (x) => aleatorio(1, Math.max(1, x - 1)),
    aplicable: (x) => x > 1,
    aplicar: (x, n) => x - n,
  },
  {
    nivelMin: 1,
    simbolo: (n) => `×${n}`,
    param: () => aleatorio(2, 5),
    aplicable: () => true,
    aplicar: (x, n) => x * n,
  },
  {
    nivelMin: 1,
    simbolo: (n) => `÷${n}`,
    param: (x) => {
      const divisores = [2, 3, 4, 5].filter((d) => x % d === 0);
      return divisores[aleatorio(0, divisores.length - 1)];
    },
    aplicable: (x) => [2, 3, 4, 5].some((d) => x % d === 0),
    aplicar: (x, n) => x / n,
  },
  {
    // Universitario en adelante
    nivelMin: 6,
    simbolo: () => "x²",
    param: () => 2,
    aplicable: (x) => x >= 2 && x <= 30,
    aplicar: (x) => x * x,
  },
  {
    nivelMin: 6,
    simbolo: () => "√x",
    param: () => 2,
    aplicable: (x) => x >= 4 && esCuadrado(x),
    aplicar: (x) => Math.sqrt(x),
  },
  {
    // Maestro en adelante
    nivelMin: 11,
    simbolo: () => "x³",
    param: () => 3,
    aplicable: (x) => x >= 2 && x <= 9,
    aplicar: (x) => x * x * x,
  },
];

// ---------- Niveles ----------

function generarNivel() {
  // La dificultad crece con el nivel: números más grandes y más pasos.
  const maxInicial = 10 + estado.nivel * 10;
  const pasos = Math.min(2 + Math.floor((estado.nivel - 1) / 2), 6);

  estado.solucion = aleatorio(1, maxInicial);
  estado.intentos = 0;
  estado.pistas = 0;
  estado.valores = [estado.solucion];

  const historial = [];

  while (historial.length < pasos) {
    const actual = estado.valores[estado.valores.length - 1];

    const candidatas = OPERACIONES
      .filter((op) => estado.nivel >= op.nivelMin && op.aplicable(actual))
      .map((op) => {
        const n = op.param(actual);
        return { op, n, res: op.aplicar(actual, n) };
      })
      .filter((c) => Number.isInteger(c.res) && c.res >= 1 && c.res <= CONFIG.limiteNumero);

    if (candidatas.length === 0) break;

    const elegida = candidatas[aleatorio(0, candidatas.length - 1)];
    historial.push(elegida.op.simbolo(elegida.n));
    estado.valores.push(elegida.res);
  }

  const final = estado.valores[estado.valores.length - 1];

  escribir("resultado", `Resultado final: ${final}`);
  escribir("operaciones", historial.join("  →  "));
  escribir("nivel", `Nivel ${estado.nivel} · ${rangoDe(estado.nivel)}`);
  escribir("puntaje", `Puntaje: ${estado.puntaje}`);
  escribir("pista", "");
  mostrarRecord();

  const campo = $("respuesta");
  if (campo) {
    campo.value = "";
    campo.focus();
  }
}

// ---------- Pistas ----------

function pedirPista() {
  if (estado.terminado) return;

  const pasos = estado.valores.length - 1;
  const maxPistas = pasos - 1; // nunca se revela el número inicial

  if (maxPistas < 1) {
    escribir("pista", "💡 Este nivel es muy corto para dar pistas");
    return;
  }
  if (estado.pistas >= maxPistas) {
    escribir("pista", "💡 No quedan más pistas en este nivel");
    return;
  }

  estado.pistas++;
  const valor = estado.valores[pasos - estado.pistas];
  const palabra = estado.pistas === 1 ? "paso" : "pasos";
  escribir(
    "pista",
    `💡 Si deshacés ${estado.pistas} ${palabra} desde el final, llegás a ${valor} (−${CONFIG.costoPista} puntos)`
  );
}

// ---------- Contrarreloj ----------

function mostrarTiempo() {
  escribir("tiempo", estado.modo === "reloj" ? `⏱️ ${Math.max(estado.tiempo, 0)} s` : "");
}

function detenerTemporizador() {
  if (estado.temporizador) {
    clearInterval(estado.temporizador);
    estado.temporizador = null;
  }
}

function iniciarTemporizador() {
  detenerTemporizador();
  estado.temporizador = setInterval(() => {
    estado.tiempo--;
    mostrarTiempo();
    if (estado.tiempo <= 0) terminarPartida();
  }, 1000);
}

function terminarPartida() {
  estado.terminado = true;
  estado.tiempo = 0;
  detenerTemporizador();
  mostrarTiempo();

  let mensaje = `⏰ ¡Se acabó el tiempo! Puntaje final: ${estado.puntaje}. El número inicial era ${estado.solucion}.`;
  if (estado.puntaje > estado.recordPrevio) mensaje += " 🏆 ¡Nuevo récord!";
  escribir("mensaje", mensaje);

  habilitar(["respuesta", "btnComprobar", "btnPista"], false);
}

// ---------- Partida ----------

function actualizarBotonModo() {
  escribir(
    "btnModo",
    estado.modo === "reloj"
      ? "⏱️ Contrarreloj: ACTIVADO"
      : "⏱️ Contrarreloj: desactivado"
  );
}

function nuevaPartida() {
  detenerTemporizador();

  estado.nivel = 1;
  estado.puntaje = 0;
  estado.terminado = false;
  estado.tiempo = CONFIG.tiempoInicial;
  estado.recordPrevio = leerRecord();

  habilitar(["respuesta", "btnComprobar", "btnPista"], true);
  escribir("mensaje", "");
  actualizarBotonModo();
  mostrarTiempo();
  generarNivel();

  if (estado.modo === "reloj") iniciarTemporizador();
}

function alternarModo() {
  estado.modo = estado.modo === "libre" ? "reloj" : "libre";
  nuevaPartida();
}

function comprobar() {
  if (estado.terminado) return;

  const entrada = $("respuesta").value.trim();
  const respuesta = Number(entrada);

  if (entrada === "" || !Number.isInteger(respuesta)) {
    escribir("mensaje", "⚠️ Ingresá un número entero");
    return;
  }

  estado.intentos++;

  if (respuesta === estado.solucion) {
    // Más puntos cuanto menos intentos y pistas, y cuanto mayor el nivel.
    const base = 10 - (estado.intentos - 1) * 3 - estado.pistas * CONFIG.costoPista;
    estado.puntaje += Math.max(base, 1) * estado.nivel;
    registrarRecord();

    const rangoAnterior = rangoDe(estado.nivel);
    estado.nivel++;
    const rangoNuevo = rangoDe(estado.nivel);

    let mensaje =
      rangoNuevo !== rangoAnterior ? `🎉 ¡Ascendiste a ${rangoNuevo}!` : "✅ Correcto";

    if (estado.modo === "reloj") {
      estado.tiempo += CONFIG.bonoAcierto;
      mensaje += ` (+${CONFIG.bonoAcierto} s)`;
      mostrarTiempo();
    }

    generarNivel();
    escribir("mensaje", mensaje);
  } else {
    let mensaje = `❌ Incorrecto (intento ${estado.intentos})`;

    if (estado.modo === "reloj") {
      estado.tiempo -= CONFIG.penalizacionError;
      mostrarTiempo();
      if (estado.tiempo <= 0) {
        terminarPartida();
        return;
      }
      mensaje += ` (−${CONFIG.penalizacionError} s)`;
    }

    escribir("mensaje", mensaje);
    $("respuesta").select();
  }
}

window.addEventListener("load", () => {
  $("respuesta").addEventListener("keydown", (e) => {
    if (e.key === "Enter") comprobar();
  });
  nuevaPartida();
});
