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
