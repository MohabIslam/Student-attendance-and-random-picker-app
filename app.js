/**
 * iSchool Attendance Manager — app.js
 * Pure ES6 JavaScript | SheetJS for Excel | LocalStorage for persistence
 */

/* ============================================================
   CONSTANTS & STATE
   ============================================================ */
const LS_STUDENTS   = 'ischool_students';
const LS_ATTENDANCE = 'ischool_attendance';

// App state
let students   = [];   // [{ name }]
let attendance = {};   // { name: { start, break, end } }

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/** Show a toast notification */
function showToast(msg, type = 'info', duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), duration);
}

/** Save state to LocalStorage */
function saveToStorage() {
  localStorage.setItem(LS_STUDENTS,   JSON.stringify(students));
  localStorage.setItem(LS_ATTENDANCE, JSON.stringify(attendance));
}

/** Load state from LocalStorage */
function loadFromStorage() {
  try {
    const s = localStorage.getItem(LS_STUDENTS);
    const a = localStorage.getItem(LS_ATTENDANCE);
    students   = s ? JSON.parse(s) : [];
    attendance = a ? JSON.parse(a) : {};
  } catch (e) {
    students = []; attendance = {};
  }
}

/** Ensure every student has an attendance record */
function ensureAttendanceRecords() {
  students.forEach(({ name }) => {
    if (!attendance[name]) {
      attendance[name] = { start: false, break: false, end: false };
    }
  });
}

/** Switch visible tab */
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });
  // Refresh relevant tab after switching
  if (tabId === 'attendance') renderAttendanceTable();
  if (tabId === 'dashboard')  renderDashboard();
  if (tabId === 'picker')     updatePickerState();
}

/* ============================================================
   IMPORT TAB
   ============================================================ */

/** Parse an xlsx ArrayBuffer and extract the "Name" column */
function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // Find the column whose header contains "name" (case-insensitive)
  const nameKey = rows.length
    ? Object.keys(rows[0]).find(k => k.toLowerCase().includes('name'))
    : null;

  if (!nameKey) {
    throw new Error('No "Name" column found in the spreadsheet.');
  }

  return rows
    .map(r => ({ name: String(r[nameKey]).trim() }))
    .filter(s => s.name);
}

/** Handle file input / drop */
function handleFile(file) {
  if (!file || !file.name.endsWith('.xlsx')) {
    showFeedback('Please upload a valid .xlsx file.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = parseExcel(e.target.result);
      if (!parsed.length) throw new Error('The file seems empty.');

      students   = parsed;
      attendance = {};       // reset attendance when new list is loaded
      ensureAttendanceRecords();
      saveToStorage();

      showFeedback(`✅ Successfully loaded ${students.length} students!`, 'success');
      showToast(`${students.length} students imported 🎉`, 'success');

      // Update student count badge
      document.getElementById('student-count-label').textContent = `${students.length} students`;
    } catch (err) {
      showFeedback(`❌ ${err.message}`, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

/** Show coloured feedback under upload zone */
function showFeedback(msg, type) {
  const el = document.getElementById('upload-feedback');
  el.textContent = msg;
  el.className = `upload-feedback ${type}`;
  el.classList.remove('hidden');
}

/** Sample students for demo purposes */
function loadSampleStudents() {
  const names = [
    'Ahmed Hassan', 'Layla Ibrahim', 'Omar Khalil', 'Sara Mostafa',
    'Youssef Sayed', 'Nour El-Din', 'Mariam Farouk', 'Khaled Ramadan',
    'Dina Adel', 'Tarek Nabil', 'Fatima Zahran', 'Amr Soliman',
    'Hana Magdy', 'Karim Ashraf', 'Ranya Ehab', 'Bassem Galal',
    'Mona Sherif', 'Islam Fathy', 'Aya Samir', 'Ziad Hassan',
    'Salma Youssef', 'Adam Lotfy', 'Lina Wael', 'Hassan Reda'
  ];
  students   = names.map(name => ({ name }));
  attendance = {};
  ensureAttendanceRecords();
  saveToStorage();

  showFeedback(`✅ Sample list loaded with ${students.length} students!`, 'success');
  showToast(`${students.length} sample students loaded 🧪`, 'info');
  document.getElementById('student-count-label').textContent = `${students.length} students`;
}

/* ============================================================
   ATTENDANCE TABLE
   ============================================================ */

/** Render the full attendance table */
function renderAttendanceTable() {
  const tbody = document.getElementById('attendance-body');
  const emptyState = document.getElementById('empty-attendance');
  const table = document.getElementById('attendance-table');

  tbody.innerHTML = '';

  if (!students.length) {
    table.classList.add('hidden');
    emptyState.classList.remove('hidden');
    updateStatsStrip();
    return;
  }

  table.classList.remove('hidden');
  emptyState.classList.add('hidden');

  students.forEach(({ name }, idx) => {
    const rec = attendance[name] || { start: false, break: false, end: false };
    const allPresent = rec.start && rec.break && rec.end;
    const anyPresent = rec.start || rec.break || rec.end;

    const statusClass = allPresent ? 'status-present'
                       : anyPresent ? 'status-partial'
                       : 'status-absent';
    const statusText  = allPresent ? '✅ Present'
                       : anyPresent ? '⚡ Partial'
                       : '❌ Absent';
    const rowClass = (!anyPresent) ? 'absent-row' : '';

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.dataset.name = name;

    tr.innerHTML = `
      <td class="td-num">${idx + 1}</td>
      <td class="td-name">${name}</td>

      <!-- Session Start -->
      <td>
        <div class="check-wrap">
          <input type="checkbox" id="start-${idx}"
            data-name="${name}" data-checkpoint="start"
            ${rec.start ? 'checked' : ''} />
          <label for="start-${idx}" class="check-label start-lbl" title="Mark start">✔</label>
        </div>
      </td>

      <!-- After Break -->
      <td>
        <div class="check-wrap">
          <input type="checkbox" id="break-${idx}"
            data-name="${name}" data-checkpoint="break"
            ${rec.break ? 'checked' : ''} />
          <label for="break-${idx}" class="check-label break-lbl" title="Mark break">✔</label>
        </div>
      </td>

      <!-- Session End -->
      <td>
        <div class="check-wrap">
          <input type="checkbox" id="end-${idx}"
            data-name="${name}" data-checkpoint="end"
            ${rec.end ? 'checked' : ''} />
          <label for="end-${idx}" class="check-label end-lbl" title="Mark end">✔</label>
        </div>
      </td>

      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    `;

    tbody.appendChild(tr);
  });

  // Attach change listeners to all checkboxes (event delegation)
  tbody.addEventListener('change', handleCheckboxChange, { once: false });

  updateStatsStrip();
  document.getElementById('student-count-label').textContent = `${students.length} students`;
}

/** Handle a checkbox toggle */
function handleCheckboxChange(e) {
  if (e.target.type !== 'checkbox') return;
  const { name, checkpoint } = e.target.dataset;
  if (!attendance[name]) attendance[name] = { start: false, break: false, end: false };
  attendance[name][checkpoint] = e.target.checked;
  saveToStorage();

  // Update just the row's status badge without full re-render
  const row = document.querySelector(`tr[data-name="${CSS.escape(name)}"]`);
  if (row) {
    const rec = attendance[name];
    const allPresent = rec.start && rec.break && rec.end;
    const anyPresent = rec.start || rec.break || rec.end;
    const statusBadge = row.querySelector('.status-badge');
    statusBadge.className = `status-badge ${allPresent ? 'status-present' : anyPresent ? 'status-partial' : 'status-absent'}`;
    statusBadge.textContent = allPresent ? '✅ Present' : anyPresent ? '⚡ Partial' : '❌ Absent';
    row.className = !anyPresent ? 'absent-row' : '';
  }
  updateStatsStrip();
}

/** Update the quick stats pills */
function updateStatsStrip() {
  const total = students.length;
  if (!total) return;

  let countStart = 0, countBreak = 0, countEnd = 0;
  students.forEach(({ name }) => {
    const r = attendance[name] || {};
    if (r.start) countStart++;
    if (r.break) countBreak++;
    if (r.end)   countEnd++;
  });

  document.getElementById('stat-start').textContent = `🟢 Start: ${countStart}/${total}`;
  document.getElementById('stat-break').textContent = `🟡 Break: ${countBreak}/${total}`;
  document.getElementById('stat-end').textContent   = `🔴 End: ${countEnd}/${total}`;
}

/** Mark all students as fully present */
function markAllPresent() {
  students.forEach(({ name }) => {
    attendance[name] = { start: true, break: true, end: true };
  });
  saveToStorage();
  renderAttendanceTable();
  showToast('All students marked as fully present ✅', 'success');
}

/** Reset all attendance for this session */
function resetSession() {
  if (!confirm('Reset all attendance for this session? This cannot be undone.')) return;
  students.forEach(({ name }) => {
    attendance[name] = { start: false, break: false, end: false };
  });
  saveToStorage();
  renderAttendanceTable();
  showToast('Session reset 🔄', 'info');
}

/* ============================================================
   EXPORT ATTENDANCE TO EXCEL
   ============================================================ */

function exportAttendance() {
  if (!students.length) {
    showToast('No students to export!', 'error');
    return;
  }

  // Build rows
  const rows = students.map(({ name }) => {
    const r = attendance[name] || {};
    return {
      Name:          name,
      'Session Start': r.start ? 'Present' : 'Absent',
      'After Break':   r.break  ? 'Present' : 'Absent',
      'Session End':   r.end    ? 'Present' : 'Absent',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [{ wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, 'attendance.xlsx');

  showToast('Attendance exported to attendance.xlsx 📥', 'success');
}

/* ============================================================
   RANDOM PICKER
   ============================================================ */

let pickInProgress = false;

/** Get the pool of students to pick from */
function getPickerPool() {
  const onlyPresent = document.getElementById('filter-present').checked;
  if (!onlyPresent) return students.map(s => s.name);

  return students
    .map(s => s.name)
    .filter(name => {
      const r = attendance[name] || {};
      return r.start || r.break || r.end;  // consider "any checkpoint" as present
    });
}

/** Animate + pick a random student */
function pickRandomStudent() {
  if (pickInProgress) return;

  const pool = getPickerPool();
  if (!pool.length) {
    showToast('No students in the pool! Import students or uncheck the filter.', 'error');
    return;
  }

  pickInProgress = true;
  document.getElementById('result-card').classList.add('hidden');

  const spinnerName = document.getElementById('spinner-name');
  spinnerName.classList.add('spinning');

  playPickSound();

  // Rapidly cycle through random names for 2.5 seconds
  const duration = 2500;
  const intervalMs = 80;
  let elapsed = 0;

  const intervalId = setInterval(() => {
    const rand = pool[Math.floor(Math.random() * pool.length)];
    spinnerName.textContent = rand;
    elapsed += intervalMs;

    if (elapsed >= duration) {
      clearInterval(intervalId);
      spinnerName.classList.remove('spinning');

      // Final pick
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      spinnerName.textContent = chosen;

      // Show result card
      document.getElementById('result-name').textContent = chosen;
      const rec = attendance[chosen] || {};
      const desc = (rec.start && rec.break && rec.end) ? '✅ Fully Present'
                  : (rec.start || rec.break || rec.end) ? '⚡ Partially Present'
                  : '❌ Absent';
      document.getElementById('result-sub').textContent = desc;
      document.getElementById('result-card').classList.remove('hidden');

      playSuccessSound();
      pickInProgress = false;
    }
  }, intervalMs);
}

/** Update picker info text */
function updatePickerState() {
  const pool = getPickerPool();
  const btn = document.getElementById('btn-pick');
  btn.textContent = `🎲 Pick from ${pool.length} student${pool.length !== 1 ? 's' : ''}!`;
}

/* ============================================================
   SOUND EFFECTS (Web Audio API — no file needed)
   ============================================================ */

function playPickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [400, 500, 600, 500, 700];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.07);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.07);
    });
  } catch (_) { /* audio not available */ }
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1046]; // C E G C (major arpeggio)
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (_) { /* audio not available */ }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {
  const total = students.length;
  document.getElementById('dash-total').textContent = total;

  if (!total) {
    ['start','break','end'].forEach(k => {
      document.getElementById(`dash-pct-${k}`).textContent = '0%';
      document.getElementById(`bar-${k}`).style.width = '0%';
    });
    document.getElementById('absent-list').innerHTML = '<li class="empty-msg">No students yet.</li>';
    return;
  }

  let countStart = 0, countBreak = 0, countEnd = 0;
  const absentNames = [];

  students.forEach(({ name }) => {
    const r = attendance[name] || {};
    if (r.start) countStart++;
    if (r.break) countBreak++;
    if (r.end)   countEnd++;
    // Absent = not present in ANY checkpoint
    if (!r.start && !r.break && !r.end) absentNames.push(name);
  });

  const pctFn = n => `${Math.round((n / total) * 100)}%`;

  document.getElementById('dash-pct-start').textContent = pctFn(countStart);
  document.getElementById('dash-pct-break').textContent = pctFn(countBreak);
  document.getElementById('dash-pct-end').textContent   = pctFn(countEnd);

  // Animate bars (short delay to allow DOM paint)
  setTimeout(() => {
    document.getElementById('bar-start').style.width = pctFn(countStart);
    document.getElementById('bar-break').style.width = pctFn(countBreak);
    document.getElementById('bar-end').style.width   = pctFn(countEnd);
  }, 100);

  // Absent list
  const absentList = document.getElementById('absent-list');
  if (!absentNames.length) {
    absentList.innerHTML = '<li class="empty-msg">All students attended! 🎉</li>';
  } else {
    absentList.innerHTML = absentNames
      .map(n => `<li>${n}</li>`)
      .join('');
  }
}

/* ============================================================
   DRAG & DROP
   ============================================================ */

function initDragDrop() {
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });
}

/* ============================================================
   INIT — wire up all events
   ============================================================ */

function init() {
  // Load persisted data
  loadFromStorage();
  ensureAttendanceRecords();

  // Restore student count badge
  document.getElementById('student-count-label').textContent = `${students.length} students`;

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Import tab
  document.getElementById('file-input').addEventListener('change', e => {
    handleFile(e.target.files[0]);
  });
  document.getElementById('btn-load-sample').addEventListener('click', loadSampleStudents);
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (!confirm('Clear all student data and attendance?')) return;
    students = []; attendance = {};
    saveToStorage();
    document.getElementById('student-count-label').textContent = '0 students';
    showFeedback('All data cleared.', 'error');
    showToast('Data cleared 🗑️', 'info');
  });

  initDragDrop();

  // Attendance tab
  document.getElementById('btn-mark-all').addEventListener('click', markAllPresent);
  document.getElementById('btn-reset-session').addEventListener('click', resetSession);
  document.getElementById('btn-export').addEventListener('click', exportAttendance);

  // Picker tab
  document.getElementById('btn-pick').addEventListener('click', pickRandomStudent);
  document.getElementById('filter-present').addEventListener('change', updatePickerState);

  // Initial renders
  renderAttendanceTable();
  updatePickerState();
}

// Boot
document.addEventListener('DOMContentLoaded', init);
