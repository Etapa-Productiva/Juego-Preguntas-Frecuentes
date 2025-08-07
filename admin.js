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

      // Buscar por documento o número de certificado
      const coincidencias = [];

      for (let id in jugadores) {
        const jugador = jugadores[id];
        if (
          jugador.documento === valor || 
          (jugador.no_certificado && jugador.no_certificado === valor)
        ) {
          coincidencias.push(jugador);
        }
      }

      if (coincidencias.length > 0) {
        let html = `<h3>🔎 Se encontraron ${coincidencias.length} intento(s):</h3><ul>`;

        coincidencias.forEach((jugador, index) => {
          html += `
            <li style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
              <p><strong>Intento ${index + 1}</strong></p>
              <p><strong>Nombre:</strong> ${jugador.nombre}</p>
              <p><strong>Documento:</strong> ${jugador.documento}</p>
              <p><strong>Programa:</strong> ${jugador.programa}</p>
              <p><strong>Puntaje:</strong> ${jugador.puntaje}</p>
              <p><strong>Correctas:</strong> ${jugador.correctas}</p>
              <p><strong>Incorrectas:</strong> ${jugador.incorrectas}</p>
              <p><strong>Porcentaje:</strong> ${jugador.porcentaje}%</p>
              <p><strong>Estado:</strong> ${jugador.estado}</p>
              <p><strong>Fecha:</strong> ${jugador.fecha}</p>
          `;

          if (jugador.no_certificado) {
            html += `<p><strong>No. Certificado:</strong> ${jugador.no_certificado}</p>`;
          }

          if (jugador.driveId) {
            html += `<p><a href="https://drive.google.com/uc?export=download&id=${jugador.driveId}" target="_blank">📥 Descargar certificado PDF</a></p>`;
          }

          html += `</li>`;
        });

        html += "</ul>";
        resultadoDiv.innerHTML = html;

      } else {
        resultadoDiv.innerHTML = "❌ No se encontró ningún registro con ese dato.";
      }
    })
    .catch(err => {
      console.error(err);
      resultadoDiv.innerHTML = "⚠️ Error al buscar la información.";
    });
}
