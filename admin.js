/*************************************************************
 *  PANEL ADMINISTRADOR - LÓGICA PRINCIPAL
 *  Autor: Gabriel Otálora
 *  Funciones:
 *    - Autenticación de administradores
 *    - Control de fechas de habilitación del juego
 *    - Búsqueda de certificados
 *    - Visualización de informes
 *************************************************************/

/* =========================================================
   LOGIN DEL ADMINISTRADOR
   ========================================================= */
function loginAdministrador() {
  // Obtener valores de correo y clave ingresados
  const correo = document.getElementById("admin-correo").value.trim();
  const clave = document.getElementById("admin-clave").value.trim();
  const mensaje = document.getElementById("mensaje-login");

  // Autenticación con Firebase Authentication
  firebase.auth().signInWithEmailAndPassword(correo, clave)
    .then(() => {
      mensaje.textContent = ""; // Limpia mensajes previos
      mostrarPanelAdmin(); // Muestra el panel si el login es correcto
    })
    .catch(error => {
      // Mensaje de error si las credenciales no son válidas
      mensaje.textContent = "❌ Acceso denegado. Verifica tus credenciales.";
      console.error(error);
    });
}

/* =========================================================
   MOSTRAR PANEL ADMINISTRATIVO
   ========================================================= */
function mostrarPanelAdmin() {
  document.getElementById("pantalla-login-admin").classList.add("oculto");
  document.getElementById("pantalla-admin").classList.remove("oculto");
  cargarFechas(); // Cargar las fechas guardadas del juego
}

/* =========================================================
   CERRAR SESIÓN DEL ADMINISTRADOR
   ========================================================= */
function cerrarSesion() {
  firebase.auth().signOut().then(() => location.reload());
}

/* =========================================================
   MANTENER SESIÓN ACTIVA SI YA ESTÁ LOGUEADO
   ========================================================= */
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    mostrarPanelAdmin();
  } else {
    document.getElementById("pantalla-login-admin").classList.remove("oculto");
  }
});

/* =========================================================
   CARGAR FECHAS DEL JUEGO DESDE FIREBASE
   ========================================================= */
function cargarFechas() {
  const ref = firebase.database().ref("configuracionJuego");

  ref.once("value").then(snapshot => {
    const data = snapshot.val();
    if (data) {
      // Mostrar fechas guardadas en los inputs
      document.getElementById("fecha-inicio").value = data.fechaInicio || "";
      document.getElementById("fecha-fin").value = data.fechaFin || "";

      // Comprobar si el juego está activo en la fecha actual
      const hoy = new Date().toISOString().split("T")[0];
      const activo = hoy >= data.fechaInicio && hoy <= data.fechaFin;
      document.getElementById("estado-juego").textContent = activo
        ? "✅ El juego está habilitado"
        : "❌ El juego está deshabilitado";
    }
  });
}

/* =========================================================
   GUARDAR RANGO DE FECHAS EN FIREBASE
   ========================================================= */
function guardarRangoFechas() {
  const inicio = document.getElementById("fecha-inicio").value;
  const fin = document.getElementById("fecha-fin").value;

  // Validar que ambas fechas se hayan ingresado
  if (!inicio || !fin) {
    alert("Debes seleccionar ambas fechas.");
    return;
  }

  // Guardar en Firebase Realtime Database
  firebase.database().ref("configuracionJuego").set({
    fechaInicio: inicio,
    fechaFin: fin
  }).then(() => {
    alert("✅ Rango de fechas actualizado.");
    cargarFechas();
  });
}

/* =========================================================
   BUSCAR CERTIFICADO POR DOCUMENTO O NÚMERO DE CERTIFICADO
   ========================================================= */
function buscarCertificado() {
  const valor = document.getElementById("inputBusqueda").value.trim();
  const resultadoDiv = document.getElementById("resultadoCertificado");

  resultadoDiv.innerHTML = "Buscando...";

  firebase.database().ref("jugadores").once("value")
    .then(snapshot => {
      const jugadores = snapshot.val();

      // Validar que existan registros
      if (!jugadores) {
        resultadoDiv.innerHTML = "❌ No se encontraron registros.";
        return;
      }

      const coincidencias = [];

      // Buscar coincidencias por documento o número de certificado
      for (let id in jugadores) {
        const jugador = jugadores[id];
        if (
          jugador.documento === valor || 
          (jugador.no_certificado && jugador.no_certificado === valor)
        ) {
          coincidencias.push(jugador);
        }
      }

      // Si se encuentran resultados
      if (coincidencias.length > 0) {
        let html = `<h3>🔎 Se encontraron ${coincidencias.length} intento(s):</h3>`;
        html += `
          <div style="overflow-x:auto;">
          <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Programa</th>
                <th>Puntaje</th>
                <th>Correctas</th>
                <th>Incorrectas</th>
                <th>%</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>No. Certificado</th>
                <th>Descargar</th>
              </tr>
            </thead>
            <tbody>
        `;

        // Recorrer y mostrar cada resultado
        coincidencias.forEach((jugador, index) => {
          html += `
            <tr>
              <td>${index + 1}</td>
              <td>${jugador.nombre || ""}</td>
              <td>${jugador.documento || ""}</td>
              <td>${jugador.programa || ""}</td>
              <td>${jugador.puntaje || 0}</td>
              <td>${jugador.correctas || 0}</td>
              <td>${jugador.incorrectas || 0}</td>
              <td>${jugador.porcentaje || 0}%</td>
              <td>${jugador.estado || ""}</td>
              <td>${jugador.fecha || ""}</td>
              <td>${jugador.no_certificado || "N/A"}</td>
              <td>
                ${jugador.driveId
                  ? `<a href="https://drive.google.com/uc?export=download&id=${jugador.driveId}" target="_blank">📥</a>`
                  : "—"}
              </td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
          </div>
        `;

        resultadoDiv.innerHTML = html;
      } 
      // Si no se encontraron coincidencias
      else {
        resultadoDiv.innerHTML = "❌ No se encontró ningún registro con ese dato.";
      }
    })
    .catch(err => {
      console.error(err);
      resultadoDiv.innerHTML = "⚠️ Error al buscar la información.";
    });
}

/* =========================================================
   MOSTRAR U OCULTAR EL INFORME EMBEBIDO
   ========================================================= */
function mostrarInforme(boton) {
  const contenedor = document.getElementById("contenedor-informe");

  if (contenedor.style.display === "none") {
    contenedor.style.display = "block";
    boton.textContent = "❌ Ocultar Informe";
  } else {
    contenedor.style.display = "none";
    boton.textContent = "📊 Ver Informe";
  }
}
