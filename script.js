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

// URL de tu Web App de Apps Script unificada
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw-1iwNForSsLLdS2vg6p1HFoxp6YLVIZ-Njh-i1o7ad0vT3H2EeLvhD3NTeq-d9TOwoQ/exec";

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

  // Validaciones básicas
  if (!nombre || !documento || !ficha || !programa || !correo || !nombreInstructor) {
    alert("Por favor, completa todos los campos.");
    return;
  }
  if (!autorizacion) {
    alert("Debes autorizar el tratamiento de datos personales.");
    return;
  }

  // Guardamos los datos globales
  nombreJugador = nombre;
  numeroFicha = ficha;
  correoUsuario = correo;
  numeroDocumento = documento;
  nombrePrograma = programa;

  // ---- 🔹 VALIDACIÓN DE INTENTOS DIARIOS 🔹 ----
  function fechaActual() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const fecha = fechaActual();
  const refIntentos = firebase.database().ref(`intentos/${numeroDocumento}/${fecha}`);

  refIntentos.get().then(snapshot => {
    let intentosHoy = snapshot.val() || 0;

    if (intentosHoy >= 3) {
      alert("❌ Ya alcanzaste el límite de 3 intentos para hoy. Intenta mañana nuevamente.");
      return; // 🚫 No deja jugar
    }

    // Aumentamos y guardamos el intento
    intentosHoy++;
    refIntentos.set(intentosHoy);

    // Mensaje de estado al aprendiz
    if (intentosHoy === 1) {
      alert("✅ Intento #1 de 3 hoy. ¡Suerte!");
    } else if (intentosHoy === 2) {
      alert("⚡ Intento #2 de 3 hoy. ¡Aprovecha bien!");
    } else if (intentosHoy === 3) {
      alert("🚨 Este es tu último intento de hoy (#3 de 3).");
    }

    // Pasar a la selección de temas
    cargarPreguntasDesdeFirebase(() => {
      document.getElementById("pantalla-nombre").classList.add("oculto");
      document.getElementById("pantalla-temas").classList.remove("oculto");
    });
  });
}

let inicioJuego = null;

function mostrarPantallaJuego() {
  document.getElementById("pantalla-temas").classList.add("oculto");
  document.getElementById("pantalla-juego").classList.remove("oculto");
  inicioJuego = Date.now(); // ✅ Marca inicio de intento
  document.getElementById("puntaje").textContent = puntaje;
  document.getElementById("tiempo-total").textContent = formatearTiempo(tiempoTotal);
  iniciarTiempoTotal();  // ✅ Solo una vez en toda la partida
  mostrarPregunta();     // ✅ Muestra la primera pregunta
  iniciarTiempoPregunta(); // ✅ Arranca tiempo de la primera pregunta

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

function iniciarTiempoTotal() {
  intervaloTotal = setInterval(() => {
    tiempoTotal--;
    document.getElementById("tiempo-total").textContent = formatearTiempo(tiempoTotal);

    if (tiempoTotal <= 0) {
      clearInterval(intervaloTotal);
      clearInterval(intervaloPregunta);
      finalizarJuego();
    }
  }, 1000);
}

function iniciarTiempoPregunta() {
  clearInterval(intervaloPregunta); // ✅ Limpiar antes de iniciar
  tiempoPregunta = 55;
  document.getElementById("tiempo-pregunta").textContent = tiempoPregunta;

  intervaloPregunta = setInterval(() => {
    tiempoPregunta--;
    document.getElementById("tiempo-pregunta").textContent = tiempoPregunta;

    if (tiempoPregunta <= 0) {
      clearInterval(intervaloPregunta);
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
    boton.disabled = false;
    boton.onclick = () => verificarRespuesta(index);
    opciones.appendChild(boton);
  });

  document.getElementById("respuesta").textContent = "";
  document.getElementById("tiempo-pregunta").textContent = tiempoPregunta = 55;
  document.getElementById("progreso-pregunta").textContent = preguntaActual + 1;
}

function verificarRespuesta(index) {
  const pregunta = preguntas[preguntaActual];

  const botones = document.querySelectorAll("#opciones button");
  botones.forEach(btn => btn.disabled = true);
  
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
  clearInterval(intervaloPregunta); // ✅ detiene el tiempo de la pregunta

  setTimeout(() => {
    preguntaActual++;
    if (preguntaActual < preguntas.length) {
      mostrarPregunta();
      iniciarTiempoPregunta(); // ✅ Solo reinicia tiempo de pregunta
    } else {
      finalizarJuego();
    }
  }, 2000);
}


function finalizarJuego() {
  if (resultadoEnviado) return;
  resultadoEnviado = true;

  // ⏱ Calculamos tiempos
  const finJuego = Date.now();
  const duracionSegundos = Math.round((finJuego - inicioJuego) / 1000); // tiempo total en segundos
  const promedioPregunta = (duracionSegundos / preguntas.length).toFixed(2);

  // ✅ Calculamos porcentaje y estado
  const porcentaje = (respuestasCorrectas / preguntas.length) * 100;
  const estado = porcentaje >= 80 ? "Aprobado" : "Reprobado";

  // 🖥️ Mostrar en pantalla final
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

  // ✅ Guardar en Firebase y Sheets con nuevos datos
  guardarResultadoFirebase(duracionSegundos, promedioPregunta, estado);
  enviarDatosUnificados(porcentaje, duracionSegundos, promedioPregunta, estado);

  // ✅ Mensaje final
  if (porcentaje >= 80) {
    alert("✅ Tu certificado será enviado a tu correo.");
  } else {
    alert("Debes acertar al menos el 80% para obtener el certificado.");
  }
}

function guardarResultadoFirebase(duracion, promedio, estado) {
  const jugadorRef = firebase.database().ref("jugadores").push();
  jugadorRef.set({
    nombre: nombreJugador,
    documento: numeroDocumento,
    ficha: numeroFicha,
    programa: nombrePrograma,
    correo: correoUsuario,
    instructor: nombreInstructor,
    puntaje: puntaje,
    correctas: respuestasCorrectas,
    incorrectas: respuestasIncorrectas,
    porcentaje: ((respuestasCorrectas/preguntas.length)*100).toFixed(2),
    estado: estado, // ✅ Aprobado o Reprobado
    duracion: duracion, // en segundos
    promedioPregunta: promedio, 
    fecha: new Date().toLocaleString()
  });
}


function enviarDatosUnificados(porcentaje, duracion, promedio, estado) {
  const fecha = new Date().toLocaleString();

  const bodyData = new URLSearchParams({
    "entry.1074037193": nombreJugador,       
    "entry.760554111": numeroDocumento,      
    "entry.1436076378": numeroFicha,         
    "entry.480386414": nombrePrograma,       
    "entry.446350167": correoUsuario,        
    "entry.1952037755": nombreInstructor,    
    "entry.1279592004": puntaje,             
    "entry.2118980774": respuestasCorrectas, 
    "entry.1770889491": respuestasIncorrectas,
    "duracion": duracion,                    
    "promedio": promedio,                    
    "estado": estado,                        
    "fecha": fecha                           
  });

  fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyData.toString(),
  });
}

  if (porcentaje >= 80) {
    alert("✅ Tu certificado será enviado a tu correo.");
  } else {
    alert("Debes acertar al menos el 80% para obtener el certificado.");
  }
}

function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
}

function volverAlInicio() {
  location.reload();
}
