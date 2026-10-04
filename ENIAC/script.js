let solucion;

function generarNivel() {

    solucion = Math.floor(Math.random() * 20) + 1;

    let actual = solucion;
    let operaciones = [];

    let suma = Math.floor(Math.random() * 10) + 1;

    actual += suma;
    operaciones.push("+" + suma);

    actual *= 2;
    operaciones.push("×2");

*   document.getElementById("result*do").innerText =
        "Resultad* final: " + actual;

    document.*etElementById("operaciones").inner*TML =
        operaciones.join("<b*>");
}

function comprobar() {

  * let respuesta = parseInt(
       *document.getElementById("respuesta*).value
    );

    if (respuesta *== solucion) {

        document.g*tElementById("mensaje").innerText *
            "✅ Correcto";

      * generarNivel();

    } else {

  *     document.getElementById("mens*je").innerText =
            "❌ In*orrecto";
    }
}

window.onload =*generarNivel;
