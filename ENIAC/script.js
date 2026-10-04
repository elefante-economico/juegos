let solucion;

function generarNivel() {

    solucion = Math.floor(Math.random() * 20) + 1;

    let actual = solucion;
    let operaciones = [];

    let suma = Math.floor(Math.random() * 10) + 1;

    actual = actual + suma;
    operaciones.push("+" + suma);

    actual = actual * 2;
    operaciones.push("×2");

    document.getElementById("resultado").innerText =
        "Resultado final: " + actual;

    document.getElementById("operaciones").innerHTML =
        operaciones.join("<br>");
}

function comprobar() {

    let respuesta = parseInt(
        document.getElementById("respuesta").value
    );

    if (respuesta === solucion) {

        document.getElementById("mensaje").innerText =
            "✅ Correcto";

        generarNivel();

    } else {

        document.getElementById("mensaje").innerText =
            "❌ Incorrecto";
    }
}

window.onload = generarNivel;
