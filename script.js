let nombreJugador = "";
let numeroDocumento = "";
let numeroFicha = "";
let nombrePrograma = "";
let correoUsuario = "";
let nombreInstructor = "";
let preguntas = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let respuestasIncorrectas = 0;
let puntaje = 0;
let tiempoTotal = 1800;
let tiempoPregunta = 55;
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
  const documento = document.getElementById("numero-documento").value.trim();
  const ficha = document.getElementById("numero-ficha").value.trim();
  const programa = document.getElementById("nombre-programa").value.trim();
  const correo = document.getElementById("correo-usuario").value.trim();
  nombreInstructor = document.getElementById("instructor").value.trim(); 
  const autorizacion = document.getElementById("autorizacion").checked;
  const tyc = document.getElementById("tyc").checked;

  if (!nombre || !documento || !ficha || !programa || !correo) {
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
  numeroDocumento = documento;
  nombrePrograma = programa;
  nombreInstructor = instructor;


  cargarPreguntasDesdeFirebase(() => {
    document.getElementById("pantalla-nombre").classList.add("oculto");
    document.getElementById("pantalla-temas").classList.remove("oculto");
  });
}

function mostrarPantallaJuego() {
  document.getElementById("pantalla-temas").classList.add("oculto");
  document.getElementById("pantalla-juego").classList.remove("oculto");
  document.getElementById("puntaje").textContent = puntaje;
  document.getElementById("tiempo-total").textContent = formatearTiempo(tiempoTotal);
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
      preguntas = todas.slice(0, 20);
      callback();
    })
    .catch(error => {
      console.error("Error cargando preguntas:", error);
    });
}

function iniciarTemporizadores() {
  intervaloTotal = setInterval(() => {
    tiempoTotal--;
    document.getElementById("tiempo-total").textContent = formatearTiempo(tiempoTotal);
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
      respuestasIncorrectas++;
      mostrarRetroalimentacion("⏱️ ¡Tiempo agotado! Respuesta incorrecta.");
      avanzarPregunta();
    }
  }, 1000);
}


function mostrarPregunta() {
  const pregunta = preguntas[preguntaActual];

  if (!pregunta || !Array.isArray(pregunta.opciones)) {
    console.error("❌ Pregunta inválida o sin opciones:", pregunta);
    alert("Hubo un problema cargando la pregunta. Intenta de nuevo.");
    finalizarJuego();
    return;
  }

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
  document.getElementById("tiempo-pregunta").textContent = tiempoPregunta = 55;
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
  if (resultadoEnviado) return;
  resultadoEnviado = true;

  const porcentaje = (respuestasCorrectas / preguntas.length) * 100;
  document.getElementById("porcentaje-final").textContent = porcentaje.toFixed(2);

  clearInterval(intervaloTotal);
  clearInterval(intervaloPregunta);
  document.getElementById("pantalla-juego").classList.add("oculto");
  document.getElementById("pantalla-final").classList.remove("oculto");

  document.getElementById("nombre-final").textContent = nombreJugador;
  document.getElementById("numero-documento").textContent = numeroDocumento;
  document.getElementById("puntaje-final").textContent = puntaje;
  document.getElementById("correctas").textContent = respuestasCorrectas;
  document.getElementById("incorrectas").textContent = respuestasIncorrectas;

  guardarResultadoFirebase();
  enviarDatosUnificados();

  if (porcentaje >= 80) {
    alert("✅ Tu certificado será enviado a tu correo.");
  } else {
    alert("Debes acertar al menos el 80% para obtener el certificado.");
  }
}

function guardarResultadoFirebase() {
  const jugadorRef = firebase.database().ref("jugadores").push();
  jugadorRef.set({
    nombre: nombreJugador,
    documento: numeroDocumento,
    ficha: numeroFicha,
    programa: nombrePrograma,
    correo: correoUsuario,
    puntaje: puntaje,
    correctas: respuestasCorrectas,
    incorrectas: respuestasIncorrectas,
    fecha: new Date().toLocaleString()
  });
}

function enviarDatosUnificados() {
  const formData = new FormData();
  formData.append("entry.1074037193", nombreJugador);      // Nombre
  formData.append("entry.760554111", numeroDocumento);     // Documento
  formData.append("entry.1436076378", numeroFicha);        // Ficha
  formData.append("entry.480386414", nombrePrograma);      // Programa
  formData.append("entry.446350167", correoUsuario);       // Correo
  formData.append("entry.1952037755", nombreInstructor);   // Instructor
  formData.append("entry.1279592004", puntaje);            // Puntaje
  formData.append("entry.2118980774", respuestasCorrectas);// Correctas
  formData.append("entry.1770889491", respuestasIncorrectas);// Incorrectas

  fetch("https://script.google.com/macros/u/2/s/AKfycbz87gFIqByFWhVFMjhYRO3ZhLPheEEMRUADit-_8knvl7awYGWDb2M0SxkDTQkf3NAzlQ/exec", {
    method: "POST",
    mode: "no-cors",
    body: formData
  });
}

function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
}



function volverAlInicio() {
  location.reload();
}
