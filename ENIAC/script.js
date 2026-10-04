// ENIAC — deducí el número inicial deshaciendo las operaciones.

const estado = {
  solucion: 0,
  nivel: 1,
  puntaje: 0,
  intentos: 0,
};

const $ = (id) => document.getElementById(id);
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

  $("resultado").textContent = `Resultado final: ${actual}`;
  $("operaciones").textContent = historial.join("  →  ");
  $("nivel").textContent = `Nivel ${estado.nivel}`;
  $("puntaje").textContent = `Puntaje: ${estado.puntaje}`;
  $("respuesta").value = "";
  $("respuesta").focus();
}

function comprobar() {
  const entrada = $("respuesta").value.trim();
  const respuesta = Number(entrada);

  if (entrada === "" || !Number.isInteger(respuesta)) {
    $("mensaje").textContent = "⚠️ Ingresá un número entero";
    return;
  }

  estado.intentos++;

  if (respuesta === estado.solucion) {
    // Más puntos cuanto menos intentos y mayor nivel.
    estado.puntaje += Math.max(10 - (estado.intentos - 1) * 3, 1) * estado.nivel;
    estado.nivel++;
    $("mensaje").textContent = "✅ Correcto";
    generarNivel();
  } else {
    $("mensaje").textContent = `❌ Incorrecto (intento ${estado.intentos})`;
    $("respuesta").select();
  }
}

window.addEventListener("load", () => {
  $("respuesta").addEventListener("keydown", (e) => {
    if (e.key === "Enter") comprobar();
  });
  generarNivel();
});
