let nombreJugador = "";
let numeroFicha = "";
let correoUsuario = "";
let preguntas = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let respuestasIncorrectas = 0;
let puntaje = 0;
let tiempoTotal = 80;
let tiempoPregunta = 20;
let intervaloTotal, intervaloPregunta;
let resultadoEnviado = false;

// Mostrar pantallas
function mostrarInstrucciones() {
  document.getElementById("pantalla-inicio").classList.add("oculto");
  document.getElementById("pantalla-instrucciones").classList.remove("oculto");
}

function mostrarPantallaNombre() {
  document.getElementById("pantalla-instrucciones").classList.add("oculto");
  document.getElementById("pantalla-nombre").classList.remove("oculto");
}

function guardarNombre() {
  const nombre = document.getElementById("nombre-usuario").value.trim();
  const ficha = document.getElementById("numero-ficha").value.trim();
  const correo = document.getElementById("correo-usuario").value.trim();
  const autorizacion = document.getElementById("autorizacion").checked;

  if (!nombre || !ficha || !correo) {
    alert("Por favor, completa todos los campos.");
    return;
  }
  if (!autorizacion) {
    alert("Debes autorizar el tratamiento de datos personales.");
    return;
  }

  nombreJugador = nombre;
  numeroFicha = ficha;
  correoUsuario = correo;

  cargarPreguntasDesdeFirebase(() => {
    document.getElementById("pantalla-nombre").classList.add("oculto");
    document.getElementById("pantalla-temas").classList.remove("oculto");
  });
}

function mostrarPantallaJuego() {
  document.getElementById("pantalla-temas").classList.add("oculto");
  document.getElementById("pantalla-juego").classList.remove("oculto");
  document.getElementById("puntaje").textContent = puntaje;
  iniciarTemporizadores();
  mostrarPregunta();
}

function cargarPreguntasDesdeFirebase(callback) {
  firebase.database().ref("preguntas").once("value")
    .then(snapshot => {
      const datos = snapshot.val();
      if (!datos) {
        alert("No hay preguntas disponibles.");
        return;
      }
      const todas = Object.values(datos);
      for (let i = todas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [todas[i], todas[j]] = [todas[j], todas[i]];
      }
      preguntas = todas.slice(0, 3);
      callback();
    })
    .catch(error => {
      console.error("Error cargando preguntas:", error);
    });
}

function iniciarTemporizadores() {
  intervaloTotal = setInterval(() => {
    tiempoTotal--;
    document.getElementById("tiempo-total").textContent = tiempoTotal;
    if (tiempoTotal <= 0) {
      clearInterval(intervaloTotal);
      clearInterval(intervaloPregunta);
      finalizarJuego();
    }
  }, 1000);

  intervaloPregunta = setInterval(() => {
    tiempoPregunta--;
    document.getElementById("tiempo-pregunta").textContent = tiempoPregunta;
    if (tiempoPregunta <= 0) {
      // Marcar como incorrecta la respuesta si el tiempo se acaba
      respuestasIncorrectas++;
      mostrarRetroalimentacion("⏱️ ¡Tiempo agotado! Respuesta incorrecta.");
      avanzarPregunta(); // Avanzar a la siguiente pregunta
    }
  }, 1000);
}

function mostrarPregunta() {
  const pregunta = preguntas[preguntaActual];
  document.getElementById("pregunta").textContent = pregunta.pregunta;
  const opciones = document.getElementById("opciones");
  opciones.innerHTML = "";

  pregunta.opciones.forEach((opcion, index) => {
    const boton = document.createElement("button");
    boton.textContent = opcion;
    boton.onclick = () => verificarRespuesta(index);
    opciones.appendChild(boton);
  });

  document.getElementById("respuesta").textContent = "";
  document.getElementById("tiempo-pregunta").textContent = tiempoPregunta = 20;
  document.getElementById("progreso-pregunta").textContent = preguntaActual + 1;
}

function verificarRespuesta(index) {
  const pregunta = preguntas[preguntaActual];
  if (index === pregunta.respuesta) {
    puntaje++;
    respuestasCorrectas++;
    mostrarRetroalimentacion("✅ ¡Respuesta correcta!");
  } else {
    respuestasIncorrectas++;
    mostrarRetroalimentacion("❌ Incorrecta. " + pregunta.retroalimentacion);
  }
  document.getElementById("puntaje").textContent = puntaje;
  avanzarPregunta();
}

function mostrarRetroalimentacion(texto) {
  document.getElementById("respuesta").textContent = texto;
}

function avanzarPregunta() {
  clearInterval(intervaloPregunta);
  setTimeout(() => {
    preguntaActual++;
    if (preguntaActual < preguntas.length) {
      mostrarPregunta();
      iniciarTemporizadores(); // reinicia solo pregunta
    } else {
      finalizarJuego();
    }
  }, 2000);
}

function finalizarJuego() {
  if (resultadoEnviado) return; // ⛔ Evita ejecuciones múltiples
  resultadoEnviado = true;

  clearInterval(intervaloTotal);
  clearInterval(intervaloPregunta);
  document.getElementById("pantalla-juego").classList.add("oculto");
  document.getElementById("pantalla-final").classList.remove("oculto");

  document.getElementById("nombre-final").textContent = nombreJugador;
  document.getElementById("puntaje-final").textContent = puntaje;
  document.getElementById("correctas").textContent = respuestasCorrectas;
  document.getElementById("incorrectas").textContent = respuestasIncorrectas;

  guardarResultadoFirebase();
  enviarGoogleSheets();
  enviarCertificadoPorCorreo(); 
}

function guardarResultadoFirebase() {
  const jugadorRef = firebase.database().ref("jugadores").push();
  jugadorRef.set({
    nombre: nombreJugador,
    ficha: numeroFicha,
    correo: correoUsuario,
    puntaje: puntaje,
    correctas: respuestasCorrectas,
    incorrectas: respuestasIncorrectas,
    fecha: new Date().toLocaleString()
  });
}

function enviarGoogleSheets() {
  const formData = new FormData();
  formData.append("entry.1170332590", nombreJugador);
  formData.append("entry.1406171993", numeroFicha);
  formData.append("entry.2108813296", correoUsuario);
  formData.append("entry.1684532845", puntaje);
  formData.append("entry.1369388644", respuestasCorrectas);
  formData.append("entry.12071704", respuestasIncorrectas);

   fetch("https://script.google.com/macros/s/AKfycbzKFYFqRCM4SS0D9mLpui4rVAMNwcmbvSBWYUB3ibrVaV7CrPGEhjKVTIbIiGn2jksMRg/exec", {
    method: "POST",
    mode: "no-cors",
    body: formData
  });
}

function enviarCertificadoPorCorreo() {
  const formData = new FormData();
  formData.append("entry.1170332590", nombreJugador);
  formData.append("entry.1406171993", numeroFicha);
  formData.append("entry.2108813296", correoUsuario);
  formData.append("entry.1684532845", puntaje);
  formData.append("entry.1369388644", respuestasCorrectas);
  formData.append("entry.12071704", respuestasIncorrectas);

  fetch("https://script.google.com/macros/s/AKfycbx5WUMbG7EFJgqTgd_UbmWhrqUyxsbfipb1nR27LtHgS_vxfdSQu0DOAZRmADADZ0TJig/exec", {
    method: "POST",
    mode: "no-cors",
    body: formData
  });
}


function volverAlInicio() {
  location.reload();
}
