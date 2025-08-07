function loginAdministrador() {
  const correo = document.getElementById("admin-correo").value.trim();
  const clave = document.getElementById("admin-clave").value.trim();
  const mensaje = document.getElementById("mensaje-login");

  firebase.auth().signInWithEmailAndPassword(correo, clave)
    .then(() => {
      mensaje.textContent = "";
      mostrarPanelAdmin();
    })
    .catch(error => {
      mensaje.textContent = "❌ Acceso denegado. Verifica tus credenciales.";
      console.error(error);
    });
}

function mostrarPanelAdmin() {
  document.getElementById("pantalla-login-admin").classList.add("oculto");
  document.getElementById("pantalla-admin").classList.remove("oculto");
  cargarFechas();
}

function cerrarSesion() {
  firebase.auth().signOut().then(() => location.reload());
}

// Verificar si hay sesión activa
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    mostrarPanelAdmin();
  } else {
    document.getElementById("pantalla-login-admin").classList.remove("oculto");
  }
});

// 🔄 Leer fechas desde Firebase
function cargarFechas() {
  const ref = firebase.database().ref("configuracionJuego");
  ref.once("value").then(snapshot => {
    const data = snapshot.val();
    if (data) {
      document.getElementById("fecha-inicio").value = data.fechaInicio || "";
      document.getElementById("fecha-fin").value = data.fechaFin || "";

      const hoy = new Date().toISOString().split("T")[0];
      const activo = hoy >= data.fechaInicio && hoy <= data.fechaFin;
      document.getElementById("estado-juego").textContent = activo
        ? "✅ El juego está habilitado"
        : "❌ El juego está deshabilitado";
    }
  });
}

// 💾 Guardar fechas
function guardarRangoFechas() {
  const inicio = document.getElementById("fecha-inicio").value;
  const fin = document.getElementById("fecha-fin").value;

  if (!inicio || !fin) {
    alert("Debes seleccionar ambas fechas.");
    return;
  }

  firebase.database().ref("configuracionJuego").set({
    fechaInicio: inicio,
    fechaFin: fin
  }).then(() => {
    alert("✅ Rango de fechas actualizado.");
    cargarFechas();
  });
}

function buscarCertificado() {
  const valor = document.getElementById("inputBusqueda").value.trim();
  const resultadoDiv = document.getElementById("resultadoCertificado");
  resultadoDiv.innerHTML = "Buscando...";

  firebase.database().ref("jugadores").once("value")
    .then(snapshot => {
      const jugadores = snapshot.val();
      if (!jugadores) {
        resultadoDiv.innerHTML = "❌ No se encontraron registros.";
        return;
      }

      let encontrado = null;

      // Buscar por documento o por número de certificado
      for (let id in jugadores) {
        const jugador = jugadores[id];
        if (jugador.documento === valor || jugador.no_certificado === valor) {
          encontrado = jugador;
          break;
        }
      }

      if (encontrado) {
        resultadoDiv.innerHTML = `
          <p><strong>Nombre:</strong> ${encontrado.nombre}</p>
          <p><strong>Documento:</strong> ${encontrado.documento}</p>
          <p><strong>Programa:</strong> ${encontrado.programa}</p>
          <p><strong>Puntaje:</strong> ${encontrado.puntaje}</p>
          <p><strong>Correctas:</strong> ${encontrado.correctas}</p>
          <p><strong>Incorrectas:</strong> ${encontrado.incorrectas}</p>
          <p><strong>Porcentaje:</strong> ${encontrado.porcentaje}%</p>
          <p><strong>Estado:</strong> ${encontrado.estado}</p>
          <p><strong>Fecha:</strong> ${encontrado.fecha}</p>
          ${encontrado.no_certificado ? `<p><strong>No. Certificado:</strong> ${encontrado.no_certificado}</p>` : ""}
        `;
      } else {
        resultadoDiv.innerHTML = "❌ No se encontró ningún certificado con ese dato.";
      }
    })
    .catch(err => {
      console.error(err);
      resultadoDiv.innerHTML = "⚠️ Error al buscar la información.";
    });
}

