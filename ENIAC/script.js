let solucion;
let resultadoFinal;

function generarNivel() {

    solucion = Math.floor(Math.random() * 20) + 1;

    let actual = solucion;

    let operaciones = [];

    let suma = Math.floor(Math.random() * 10) + 1;
    actual += suma;

    operaciones.push("+" + suma);

    actual *= 2;

    operaciones.pus*("×2");

    resultadoFinal = actu*l;

    document.getElementById("r*sultado").innerText =
        "Res*ltado final: " + resultadoFinal;

*   document.getElementById("operac*ones").innerHTML =
        operaci*nes.join("<br>");

    document.ge*ElementById("mensaje").innerText =*"";

    document.getElementById("*espuesta").value = "";
}

function*comprobar() {

    let respuesta =*        parseInt(document.getEleme*tById("respuesta").value);

    if*(respuesta === solucion) {

      * document.getElementById("mensaje"*.innerText =
            "✅ Correc*o";

        setTimeout(generarNiv*l, 1500);

    } else {

        d*cument.getElementById("mensaje").i*nerText =
            "❌ Incorrect*";

    }
}

generarNivel();