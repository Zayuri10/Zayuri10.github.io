let tareaEditandoId = null;

document.addEventListener("DOMContentLoaded", function () {
    inicializarNotificaciones();
    cargarTareas();
    verificarRecordatorios();
    setInterval(verificarRecordatorios, 60000); 
    document.getElementById("btn-crear-editar").addEventListener("click", crearTarea);

    document.querySelectorAll(".kanban-block").forEach(block => {
        block.addEventListener("dragover", allowDrop);
        block.addEventListener("drop", drop);
    });

    const actividadPanel = document.createElement("div");
    actividadPanel.id = "panel-actividades";
    actividadPanel.innerHTML = `
        <h3>Panel de Actividades</h3>
        <button id="btn-notificaciones">Activar Notificaciones</button>
        <ul id="lista-actividades"></ul>
    `;
    document.getElementById("kanban").appendChild(actividadPanel);

    document.getElementById("btn-notificaciones").addEventListener("click", solicitarPermisoNotificaciones);
});

function solicitarPermisoNotificaciones() {
    if (typeof Notification === "undefined") {
        alert("Tu navegador no soporta notificaciones");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            registrarActividad("Notificaciones activadas");
            alert("¡Notificaciones activadas correctamente!");
        } else {
            registrarActividad("Usuario rechazó notificaciones");
            alert("Las notificaciones fueron bloqueadas. Puedes activarlas más tarde.");
        }
    }).catch(error => {
        console.error("Error al solicitar permiso:", error);
        registrarActividad("Error al activar notificaciones");
    });
}
function crearTarea(event) {
    event.preventDefault();

    const nombre = document.getElementById("tarea.nombre").value.trim();
    const descripcion = document.getElementById("tarea-descrpcion").value.trim();
    const responsable = document.getElementById("tarea-responsable").value.trim();
    const subtareasInput = document.getElementById("tarea-subtareas").value.trim();
    const recordatorioFecha = document.getElementById("tarea-recordatorio-fecha")?.value;
    const recordatorioHora = document.getElementById("tarea-recordatorio-hora")?.value;

    if (!nombre || !descripcion || !responsable) {
        alert("Todos los campos deben estar llenos.");
        return;
    }

    const subtareas = subtareasInput
        ? subtareasInput.split(",").map(s => s.trim()).filter(s => s !== "").map(s => ({ texto: s, completado: false }))
        : [];

    const tareas = obtenerTareas();

    if (tareaEditandoId) {
        const tarea = tareas.find(t => t.id === tareaEditandoId);
        tarea.nombre = nombre;
        tarea.descripcion = descripcion;
        tarea.responsable = responsable;
        tarea.subtareas = subtareas;
        tarea.recordatorio = recordatorioFecha && recordatorioHora ? `${recordatorioFecha}T${recordatorioHora}` : null;

        localStorage.setItem("tareas", JSON.stringify(tareas));
        tareaEditandoId = null;
        document.getElementById("btn-crear-editar").textContent = "Crear Tarea";

        document.querySelectorAll(".tarea").forEach(el => el.remove());
        cargarTareas();
        registrarActividad(`Tarea "${nombre}" editada`);
    } else {
        const nuevaTarea = {
            id: `tarea-${Date.now()}`,
            nombre,
            descripcion,
            responsable,
            estado: "pendientes",
            subtareas,
            recordatorio: recordatorioFecha && recordatorioHora ? `${recordatorioFecha}T${recordatorioHora}` : null
        };

        tareas.push(nuevaTarea);
        localStorage.setItem("tareas", JSON.stringify(tareas));
        crearElementoTarea(nuevaTarea);
        registrarActividad(`Tarea "${nombre}" creada`);
    }

    document.getElementById("tarea.nombre").value = "";
    document.getElementById("tarea-descrpcion").value = "";
    document.getElementById("tarea-responsable").value = "";
    document.getElementById("tarea-subtareas").value = "";
    if (document.getElementById("tarea-recordatorio-fecha")) {
        document.getElementById("tarea-recordatorio-fecha").value = "";
        document.getElementById("tarea-recordatorio-hora").value = "";
    }
}

function cargarTareas() {
    const tareas = obtenerTareas();
    tareas.forEach(tarea => crearElementoTarea(tarea));
}

function obtenerTareas() {
    const tareasGuardadas = localStorage.getItem("tareas");
    return tareasGuardadas ? JSON.parse(tareasGuardadas) : [];
}

function crearElementoTarea(tarea) {
    const tareaDiv = document.createElement("div");
    tareaDiv.classList.add("tarea");
    tareaDiv.setAttribute("id", tarea.id);

    if (tarea.estado === "tareasCompletadas") {
        tareaDiv.setAttribute("draggable", "false");
    } else {
        tareaDiv.setAttribute("draggable", "true");
        tareaDiv.addEventListener("dragstart", drag);
    }

    let subtareasHTML = "";
    if (tarea.subtareas && tarea.subtareas.length > 0) {
        subtareasHTML = `
            <ul>
                ${tarea.subtareas.map(s => `<li><input type="checkbox" ${s.completado ? "checked" : ""} disabled> ${s.texto}</li>`).join("")}
            </ul>
        `;
    }

    const recordatorioHTML = tarea.recordatorio ? `<small>Recordatorio: ${new Date(tarea.recordatorio).toLocaleString()}</small>` : "";

    tareaDiv.innerHTML = `
        <strong>${tarea.nombre}</strong>
        <p>${tarea.descripcion}</p>
        <small>Responsable: ${tarea.responsable}</small><br>
        ${recordatorioHTML}
        ${subtareasHTML}
        <div class="acciones">
            <button onclick="editarTarea('${tarea.id}')">Editar</button>
            <button onclick="eliminarTarea('${tarea.id}')">Eliminar</button>
        </div>
    `;

    const bloque = document.getElementById(tarea.estado);
    if (bloque) {
        bloque.appendChild(tareaDiv);
    }
}

function editarTarea(id) {
    const tareas = obtenerTareas();
    const tarea = tareas.find(t => t.id === id);

    if (tarea) {
        document.getElementById("tarea.nombre").value = tarea.nombre;
        document.getElementById("tarea-descrpcion").value = tarea.descripcion;
        document.getElementById("tarea-responsable").value = tarea.responsable;
        document.getElementById("tarea-subtareas").value = tarea.subtareas ? tarea.subtareas.map(s => s.texto).join(", ") : "";

        if (tarea.recordatorio) {
            const fecha = new Date(tarea.recordatorio);
            document.getElementById("tarea-recordatorio-fecha").value = fecha.toISOString().split("T")[0];
            document.getElementById("tarea-recordatorio-hora").value = fecha.toTimeString().slice(0, 5);
        }

        tareaEditandoId = id;
        document.getElementById("btn-crear-editar").textContent = "Guardar Cambios";
    }
}

function eliminarTarea(id) {
    let tareas = obtenerTareas();
    const tarea = tareas.find(t => t.id === id);
    tareas = tareas.filter(t => t.id !== id);
    localStorage.setItem("tareas", JSON.stringify(tareas));

    const tareaDiv = document.getElementById(id);
    if (tareaDiv) {
        tareaDiv.remove();
    }

    registrarActividad(`Tarea "${tarea?.nombre || id}" eliminada`);
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.id);
}

let tareaTemporal = null;
let columnaOrigen = null;

function drop(event) {
    event.preventDefault();
    const tareaId = event.dataTransfer.getData("text");
    const tarea = document.getElementById(tareaId);
    const columna = event.target.closest(".kanban-block");

    if (tarea.estado === "terminadas" || columna.id === "terminadas") return;

    const tareas = obtenerTareas();
    const tareaDatos = tareas.find(t => t.id === tareaId);

    if (!columna || !tareaDatos) return;

    if (columna.id === "completados") {
        tareaTemporal = tarea;
        columnaOrigen = document.getElementById(tareaDatos.estado);
        document.getElementById("confirmModal").style.display = "flex";
    } else {
        columna.appendChild(tarea);
        tareaDatos.estado = columna.id;
        localStorage.setItem("tareas", JSON.stringify(tareas));
        registrarActividad(`Tarea "${tareaDatos.nombre}" movida a ${columna.id}`);
    }
}

function confirmarCompletado(confirmado) {
    document.getElementById("confirmModal").style.display = "none";

    if (confirmado && tareaTemporal) {
        const palomita = document.createElement("span");
        palomita.textContent = " ✅";
        tareaTemporal.querySelector("strong").appendChild(palomita);

        document.getElementById("terminadas").appendChild(tareaTemporal);
        actualizarEstadoTarea(tareaTemporal.id, "terminadas");

        const tarea = obtenerTareas().find(t => t.id === tareaTemporal.id);
        registrarActividad(`Tarea "${tarea?.nombre || tareaTemporal.id}" completada`);
    } else if (tareaTemporal && columnaOrigen) {
        columnaOrigen.appendChild(tareaTemporal);
        actualizarEstadoTarea(tareaTemporal.id, columnaOrigen.id);
    }

    tareaTemporal = null;
    columnaOrigen = null;
}

function actualizarEstadoTarea(tareaId, nuevoEstado) {
    const tareas = obtenerTareas();
    const tarea = tareas.find(t => t.id === tareaId);
    if (tarea) {
        tarea.estado = nuevoEstado;
        localStorage.setItem("tareas", JSON.stringify(tareas));
    }
}

function inicializarNotificaciones() {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

function verificarRecordatorios() {
    const tareas = obtenerTareas();
    const ahora = new Date();

    tareas.forEach((t,i) => {
        if (t.recordatorio && !t.notificada) {
            const fechaRecordatorio = new Date(t.recordatorio);
            if (
                fechaRecordatorio.getFullYear() === ahora.getFullYear() &&
                fechaRecordatorio.getMonth() === ahora.getMonth() &&
                fechaRecordatorio.getDate() === ahora.getDate() &&
                fechaRecordatorio.getHours() === ahora.getHours() &&
                fechaRecordatorio.getMinutes() === ahora.getMinutes()
            ) {
                mostrarNotificacion(`Recordatorio: ${t.nombre}`, `Vence hoy: ${fechaRecordatorio.toLocaleTimeString()}`);
                tareas[i].notificada = true;
            }
        }
    });
    localStorage.setItem("tareas", JSON.stringify(tareas));

}

function mostrarNotificacion(titulo, cuerpo) {
    if (Notification.permission === "granted") {
        new Notification(titulo, { body: cuerpo });
        const audio = new Audio("recordatorio.mp3");
        audio.play();
    }
    else {
        // Mostrar modal en vez de una notificación del sistema
        document.getElementById("mensajeNotificacion").textContent = `${titulo} - ${cuerpo}`;
        document.getElementById("notificacionModal").style.display = "flex";
    }
}

function cerrarNotificacion() {
    document.getElementById("notificacionModal").style.display = "none";
}


function registrarActividad(mensaje) {
    const lista = document.getElementById("lista-actividades");
    const li = document.createElement("li");
    li.textContent = `[${new Date().toLocaleTimeString()}] ${mensaje}`;
    lista.prepend(li);
}