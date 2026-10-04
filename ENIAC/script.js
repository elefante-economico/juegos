// ENIAC — deducí el número inicial deshaciendo las operaciones.

const estado = {
  solucion: 0,
  nivel: 1,
  puntaje: 0,
  intentos: 0,
};

const $ = (id) => document.getElementById(id);

// Escribe texto en un elemento; si no existe en el HTML, lo ignora sin romper el juego.
const escribir = (id, texto) => {
  const el = $(id);
  if (el) el.textContent = texto;
};
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

// Cada operación se aplica solo si el resultado sigue siendo un entero positivo,
// así el jugador siempre puede revertirla con números exactos.
const OPERACIONES = [
  {
    simbolo: (n) => `+${n}`,
    param: () => aleatorio(1, 10),
    aplicable: () => true,
    aplicar: (x, n) => x + n,
  },
  {
    simbolo: (n) => `−${n}`,
    param: (x) => aleatorio(1, Math.max(1, x - 1)),
    aplicable: (x) => x > 1,
    aplicar: (x, n) => x - n,
  },
  {
    simbolo: (n) => `×${n}`,
    param: () => aleatorio(2, 5),
    aplicable: () => true,
    aplicar: (x, n) => x * n,
  },
  {
    simbolo: (n) => `÷${n}`,
    param: (x) => {
      const divisores = [2, 3, 4, 5].filter((d) => x % d === 0);
      return divisores[aleatorio(0, divisores.length - 1)];
    },
    aplicable: (x) => [2, 3, 4, 5].some((d) => x % d === 0),
    aplicar: (x, n) => x / n,
  },
];

function generarNivel() {
  // La dificultad crece con el nivel: números más grandes y más pasos.
  const maxInicial = 10 + estado.nivel * 10;
  const pasos = Math.min(2 + Math.floor((estado.nivel - 1) / 2), 6);

  estado.solucion = aleatorio(1, maxInicial);
  estado.intentos = 0;

  let actual = estado.solucion;
  const historial = [];

  while (historial.length < pasos) {
    const op = OPERACIONES[aleatorio(0, OPERACIONES.length - 1)];
    if (!op.aplicable(actual)) continue;

    const n = op.param(actual);
    actual = op.aplicar(actual, n);
    historial.push(op.simbolo(n));
  }

  escribir("resultado", `Resultado final: ${actual}`);
  escribir("operaciones", historial.join("  →  "));
  escribir("nivel", `Nivel ${estado.nivel} · ${rangoDe(estado.nivel)}`);
  escribir("puntaje", `Puntaje: ${estado.puntaje}`);
  $("respuesta").value = "";
  $("respuesta").focus();
}

function comprobar() {
  const entrada = $("respuesta").value.trim();
  const respuesta = Number(entrada);

  if (entrada === "" || !Number.isInteger(respuesta)) {
    escribir("mensaje", "⚠️ Ingresá un número entero");
    return;
  }

  estado.intentos++;

  if (respuesta === estado.solucion) {
    // Más puntos cuanto menos intentos y mayor nivel.
    estado.puntaje += Math.max(10 - (estado.intentos - 1) * 3, 1) * estado.nivel;
    const rangoAnterior = rangoDe(estado.nivel);
    estado.nivel++;
    const rangoNuevo = rangoDe(estado.nivel);

    generarNivel();
    escribir(
      "mensaje",
      rangoNuevo !== rangoAnterior
        ? `🎉 ¡Ascendiste a ${rangoNuevo}!`
        : "✅ Correcto"
    );
  } else {
    escribir("mensaje", `❌ Incorrecto (intento ${estado.intentos})`);
    $("respuesta").select();
  }
}

window.addEventListener("load", () => {
  $("respuesta").addEventListener("keydown", (e) => {
    if (e.key === "Enter") comprobar();
  });
  generarNivel();
});
