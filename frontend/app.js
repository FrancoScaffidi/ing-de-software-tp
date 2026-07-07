// ===========================================================================
//  Módulo de Recepción - Hospital Argentino
//  Panel de administración (sidebar + secciones). Consume la API REST.
// ===========================================================================
const API = '/api';
const $ = (id) => document.getElementById(id);

async function api(path, opts) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}
function msg(el, text, ok) { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); }
// Fecha local en formato YYYY-MM-DD (evita el corrimiento de día de toISOString/UTC)
function localISO(dt = new Date()) {
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const hoyISO = () => localISO();

// --------------------------- Navegación ------------------------------------
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach((s) => s.classList.add('hidden'));
    $('sec-' + btn.dataset.section).classList.remove('hidden');
    $('page-title').textContent = btn.dataset.title;
  });
});

// --------------------------- Carga inicial ---------------------------------
async function init() {
  const f = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('today').textContent = f.format(new Date());
  // Fecha de turno: mínimo hoy y por defecto mañana (donde hay disponibilidad cargada)
  const fInput = $('turno-fecha');
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  fInput.min = localISO();
  fInput.value = localISO(manana);
  await Promise.all([cargarObrasSociales(), cargarPacientes(), cargarEspecialidades()]);
  await cargarTurnos();
}

async function cargarObrasSociales() {
  const os = await api('/ObrasSociales');
  const sel = $('pac-obrasocial');
  sel.innerHTML = '<option value="">Particular (sin cobertura)</option>';
  os.forEach((o) => sel.insertAdjacentHTML('beforeend',
    `<option value="${o.IdObraSocial}">${o.NombreObraSocial}</option>`));
}

async function cargarEspecialidades() {
  const esp = await api('/Turnos/Especialidades');
  const sel = $('turno-especialidad');
  sel.innerHTML = '<option value="">Elija especialidad</option>';
  esp.forEach((e) => sel.insertAdjacentHTML('beforeend',
    `<option value="${e.IdEspecialidad}">${e.NombreEspecialidad}</option>`));
  $('stat-especialidades').textContent = esp.length;
}

// --------------------------- Pacientes -------------------------------------
async function cargarPacientes() {
  const pacientes = await api('/Pacientes');

  const sel = $('turno-paciente');
  sel.innerHTML = '<option value="">Seleccione un paciente</option>';
  pacientes.forEach((p) => sel.insertAdjacentHTML('beforeend',
    `<option value="${p.IdPaciente}">${p.Apellido}, ${p.Nombre} (${p.TipoDoc} ${p.NumeroDoc})</option>`));

  const tbody = $('tabla-pacientes');
  tbody.innerHTML = '';
  if (!pacientes.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Sin pacientes registrados.</td></tr>';
  } else {
    pacientes.forEach((p) => tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><strong>${p.Apellido}, ${p.Nombre}</strong></td>
        <td>${p.TipoDoc} ${p.NumeroDoc}</td>
        <td>${p.NombreObraSocial || '<span style="color:#94a3b8">Particular</span>'}</td>
        <td>${p.Telefono || '-'}${p.Mail ? '<br><span style="color:#94a3b8">' + p.Mail + '</span>' : ''}</td>
      </tr>`));
  }
  $('stat-pacientes').textContent = pacientes.length;
}

$('btn-guardar-paciente').addEventListener('click', async () => {
  const body = {
    Nombre: $('pac-nombre').value.trim(),
    Apellido: $('pac-apellido').value.trim(),
    TipoDoc: $('pac-tipodoc').value,
    NumeroDoc: $('pac-nrodoc').value.trim(),
    Mail: $('pac-email').value.trim(),
    Domicilio: $('pac-domicilio').value.trim(),
    Telefono: $('pac-telefono').value.trim(),
    IdObraSocial: $('pac-obrasocial').value || null,
  };
  if (!body.Nombre || !body.Apellido || !body.TipoDoc || !body.NumeroDoc) {
    return msg($('pac-msg'), 'Completá nombre, apellido, tipo y N.º de documento.', false);
  }
  try {
    await api('/Pacientes', { method: 'POST', body: JSON.stringify(body) });
    msg($('pac-msg'), 'Paciente registrado correctamente.', true);
    ['pac-nombre','pac-apellido','pac-nrodoc','pac-email','pac-domicilio','pac-telefono']
      .forEach((id) => ($(id).value = ''));
    $('pac-tipodoc').value = ''; $('pac-obrasocial').value = '';
    await cargarPacientes();
  } catch (e) { msg($('pac-msg'), e.message, false); }
});

// --------------------------- Cascada de reserva ----------------------------
$('turno-especialidad').addEventListener('change', async (ev) => {
  const idEsp = ev.target.value;
  const selMed = $('turno-medico');
  resetHoras('Elija médico y fecha');
  if (!idEsp) {
    selMed.disabled = true;
    selMed.innerHTML = '<option value="">Elija especialidad primero</option>';
    return;
  }
  const medicos = await api(`/Turnos/MedicosPorEspecialidad/${idEsp}`);
  selMed.disabled = false;
  selMed.innerHTML = '<option value="">Elija médico</option>';
  medicos.forEach((m) => selMed.insertAdjacentHTML('beforeend',
    `<option value="${m.IdMedicoEspecialidad}" data-idmedico="${m.IdMedico}">${m.Apellido}, ${m.Nombre}</option>`));
});

$('turno-medico').addEventListener('change', cargarHorarios);
$('turno-fecha').addEventListener('change', cargarHorarios);

async function cargarHorarios() {
  const idMedico = $('turno-medico').selectedOptions[0]?.dataset.idmedico;
  const fecha = $('turno-fecha').value;
  resetHoras('Cargando...');
  if (!idMedico || !fecha) return resetHoras('Elija médico y fecha');
  try {
    const horas = await api(`/Turnos/Disponibilidad/${idMedico}/${fecha}`);
    if (!horas.length) return resetHoras('Sin horarios disponibles');
    const sel = $('turno-hora');
    sel.disabled = false;
    sel.innerHTML = '<option value="">Elija horario</option>';
    horas.forEach((h) => sel.insertAdjacentHTML('beforeend', `<option value="${h}">${h}</option>`));
  } catch (e) { resetHoras('Error al cargar'); }
}
function resetHoras(txt) {
  const sel = $('turno-hora');
  sel.disabled = true;
  sel.innerHTML = `<option value="">${txt}</option>`;
}

$('btn-confirmar-turno').addEventListener('click', async () => {
  const body = {
    IdPaciente: $('turno-paciente').value,
    IdMedicoEspecialidad: $('turno-medico').value,
    Fecha: $('turno-fecha').value,
    Hora: $('turno-hora').value,
    Motivo: $('turno-motivo').value.trim(),
  };
  if (!body.IdPaciente || !body.IdMedicoEspecialidad || !body.Fecha || !body.Hora) {
    return msg($('turno-msg'), 'Elegí paciente, especialidad, médico, fecha y horario.', false);
  }
  try {
    await api('/Turnos', { method: 'POST', body: JSON.stringify(body) });
    msg($('turno-msg'), 'Turno confirmado. Recordatorio programado 24 hs antes.', true);
    $('turno-motivo').value = ''; $('turno-hora').value = '';
    await cargarHorarios();
    await cargarTurnos();
  } catch (e) { msg($('turno-msg'), e.message, false); }
});

// --------------------------- Agenda + stats + dashboard --------------------
let turnosCache = [];
function filaTurno(t, conMotivo) {
  const badge = `badge-${(t.Estado || '').toLowerCase()}`;
  return `<tr>
    <td>#${t.IdTurno}</td>
    <td>${t.Paciente}</td>
    <td>${t.Especialidad}</td>
    <td>${t.Fecha} · ${String(t.Hora).slice(0,5)}</td>
    ${conMotivo ? `<td>${t.Motivo || '-'}</td>` : ''}
    <td><span class="badge ${badge}">${t.Estado}</span></td>
  </tr>`;
}

async function cargarTurnos() {
  turnosCache = await api('/Turnos');

  // Agenda completa
  const tbody = $('tabla-turnos');
  tbody.innerHTML = turnosCache.length
    ? turnosCache.map((t) => filaTurno(t, true)).join('')
    : '<tr><td colspan="6" class="empty">No hay turnos agendados.</td></tr>';

  // Dashboard: próximos turnos (máx 6)
  const dash = $('dash-proximos');
  dash.innerHTML = turnosCache.length
    ? turnosCache.slice(0, 6).map((t) => filaTurno(t, false)).join('')
    : '<tr><td colspan="5" class="empty">No hay turnos próximos.</td></tr>';

  // Stats
  $('stat-turnos').textContent = turnosCache.length;
  $('stat-hoy').textContent = turnosCache.filter((t) => t.Fecha === hoyISO()).length;

  cargarTurnosFacturables();
}

// --------------------------- Facturación -----------------------------------
function cargarTurnosFacturables() {
  const sel = $('fact-turno');
  sel.innerHTML = '<option value="">Seleccione un turno</option>';
  turnosCache.forEach((t) => sel.insertAdjacentHTML('beforeend',
    `<option value="${t.IdTurno}" data-idesp="${t.IdEspecialidad}">#${t.IdTurno} · ${t.Paciente} (${t.Especialidad})</option>`));
}

$('fact-turno').addEventListener('change', async (ev) => {
  const idEsp = ev.target.selectedOptions[0]?.dataset.idesp;
  const cont = $('fact-practicas');
  cont.innerHTML = ''; $('fact-total').textContent = '0.00'; $('btn-facturar').disabled = true;
  if (!idEsp) return;
  const practicas = await api(`/Practicas?idEspecialidad=${idEsp}`);
  practicas.forEach((p) => cont.insertAdjacentHTML('beforeend', `
    <label>
      <input type="checkbox" class="fact-item" value="${p.IdPractica}" data-precio="${p.Honorario}" />
      <span>${p.NombrePractica}</span>
      <span style="margin-left:auto;font-weight:600">$${Number(p.Honorario).toFixed(2)}</span>
    </label>`));
  cont.querySelectorAll('.fact-item').forEach((c) => c.addEventListener('change', recalcularTotal));
  $('btn-facturar').disabled = false;
});

function recalcularTotal() {
  let total = 0;
  document.querySelectorAll('.fact-item:checked').forEach((c) => (total += Number(c.dataset.precio)));
  $('fact-total').textContent = total.toFixed(2);
}

$('btn-facturar').addEventListener('click', async () => {
  const idTurno = $('fact-turno').value;
  const detalle = [...document.querySelectorAll('.fact-item:checked')]
    .map((c) => ({ IdPractica: Number(c.value), Cantidad: 1 }));
  if (!idTurno || detalle.length === 0) {
    return msg($('fact-msg'), 'Elegí un turno y al menos una práctica.', false);
  }
  try {
    const r = await api('/Facturas', {
      method: 'POST',
      body: JSON.stringify({
        IdTurno: Number(idTurno),
        IdRecepcionista: 1,
        MedioPago: $('fact-mediopago').value,
        detalle,
      }),
    });
    msg($('fact-msg'), `Factura #${r.IdFactura} generada. Total: $${Number(r.MontoTotal).toFixed(2)}`, true);
  } catch (e) { msg($('fact-msg'), e.message, false); }
});

init().catch((e) => console.error(e));
