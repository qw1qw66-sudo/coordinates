/* عارض الإحداثيات — Coordinates Viewer
 * Runs entirely in the browser. No backend required.
 */

(function () {
  "use strict";

  // ---- Configuration -------------------------------------------------------

  // Arabic header names we look for. Fallbacks (English / common variants)
  // are included so the app is forgiving about the source file.
  const NUMBER_HEADERS = ["الرقم", "رقم", "number", "no", "id"];
  const COORDS_HEADERS = ["مكان العمل", "الإحداثيات", "الاحداثيات", "coordinates", "location", "coords"];

  // ---- State ---------------------------------------------------------------

  let records = []; // [{ number, coordsRaw, lat, lng, valid }]

  // ---- DOM refs ------------------------------------------------------------

  const fileInput = document.getElementById("fileInput");
  const loadSampleBtn = document.getElementById("loadSampleBtn");
  const exportBtn = document.getElementById("exportBtn");
  const searchInput = document.getElementById("searchInput");
  const tableBody = document.getElementById("tableBody");
  const statusMsg = document.getElementById("statusMsg");
  const toast = document.getElementById("toast");
  const totalCountEl = document.getElementById("totalCount");
  const validCountEl = document.getElementById("validCount");
  const missingCountEl = document.getElementById("missingCount");

  // ---- Coordinate parsing / validation ------------------------------------

  /**
   * Parse a "latitude, longitude" string (space optional). Returns
   * { lat, lng } when valid, otherwise null.
   */
  function parseCoordinates(raw) {
    if (raw === null || raw === undefined) return null;
    const text = String(raw).trim();
    if (!text) return null;

    // Split on a comma with optional surrounding whitespace.
    const parts = text.split(/\s*,\s*/);
    if (parts.length !== 2) return null;

    const lat = Number(parts[0]);
    const lng = Number(parts[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;

    return { lat, lng };
  }

  function mapUrl(lat, lng) {
    return "https://www.google.com/maps?q=" + lat + "," + lng;
  }

  // ---- Header detection ----------------------------------------------------

  function findHeaderKey(headerRow, candidates) {
    for (let i = 0; i < headerRow.length; i++) {
      const cell = String(headerRow[i] || "").trim().toLowerCase();
      if (!cell) continue;
      for (const cand of candidates) {
        if (cell === cand.toLowerCase()) return i;
      }
    }
    // looser contains match as a second pass
    for (let i = 0; i < headerRow.length; i++) {
      const cell = String(headerRow[i] || "").trim().toLowerCase();
      if (!cell) continue;
      for (const cand of candidates) {
        if (cell.includes(cand.toLowerCase())) return i;
      }
    }
    return -1;
  }

  // ---- Build records from a 2D array of rows -------------------------------

  function buildRecords(rows) {
    if (!rows || !rows.length) {
      throw new Error("الملف فارغ أو غير صالح.");
    }

    const headerRow = rows[0].map((c) => (c === null || c === undefined ? "" : c));
    let numberIdx = findHeaderKey(headerRow, NUMBER_HEADERS);
    let coordsIdx = findHeaderKey(headerRow, COORDS_HEADERS);

    // If headers were not detected, assume first column = number, second = coords.
    let startRow = 1;
    if (numberIdx === -1 && coordsIdx === -1) {
      numberIdx = 0;
      coordsIdx = 1;
      startRow = 0; // no header row to skip
    } else {
      if (numberIdx === -1) numberIdx = 0;
      if (coordsIdx === -1) coordsIdx = 1;
    }

    const out = [];
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r] || [];
      const number = row[numberIdx];
      const coordsRaw = row[coordsIdx];

      // skip fully empty rows
      const hasNumber = number !== null && number !== undefined && String(number).trim() !== "";
      const hasCoords = coordsRaw !== null && coordsRaw !== undefined && String(coordsRaw).trim() !== "";
      if (!hasNumber && !hasCoords) continue;

      const parsed = parseCoordinates(coordsRaw);
      out.push({
        number: hasNumber ? String(number).trim() : "",
        coordsRaw: hasCoords ? String(coordsRaw).trim() : "",
        lat: parsed ? parsed.lat : null,
        lng: parsed ? parsed.lng : null,
        valid: !!parsed,
      });
    }

    return out;
  }

  // ---- Rendering -----------------------------------------------------------

  function renderTable(list) {
    tableBody.innerHTML = "";

    if (!list.length) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="4" class="empty-state">لا توجد نتائج مطابقة.</td>';
      tableBody.appendChild(tr);
      return;
    }

    const frag = document.createDocumentFragment();

    for (const rec of list) {
      const tr = document.createElement("tr");

      if (rec.valid) {
        tr.className = "clickable-row";
        tr.title = "اضغط لفتح الموقع في خرائط Google";
      }

      // Number cell
      const tdNum = document.createElement("td");
      tdNum.className = "cell-number";
      tdNum.textContent = rec.number || "—";
      tr.appendChild(tdNum);

      // Coordinates cell
      const tdCoords = document.createElement("td");
      if (rec.coordsRaw) {
        tdCoords.className = "cell-coords";
        tdCoords.textContent = rec.coordsRaw;
      } else {
        tdCoords.className = "cell-coords no-coords";
        tdCoords.textContent = "لا توجد إحداثيات";
      }
      tr.appendChild(tdCoords);

      // Actions cell (map + copy)
      const tdActions = document.createElement("td");
      tdActions.className = "cell-actions";

      const mapBtn = document.createElement("button");
      mapBtn.type = "button";
      mapBtn.className = "action-btn map-btn";
      mapBtn.textContent = "فتح في Google Maps";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "action-btn copy-btn";
      copyBtn.textContent = "نسخ الرابط";

      if (rec.valid) {
        const url = mapUrl(rec.lat, rec.lng);
        mapBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          window.open(url, "_blank", "noopener");
        });
        copyBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          copyToClipboard(url);
        });
      } else {
        mapBtn.disabled = true;
        copyBtn.disabled = true;
      }

      tdActions.appendChild(mapBtn);
      tdActions.appendChild(copyBtn);
      tr.appendChild(tdActions);

      // Status cell
      const tdStatus = document.createElement("td");
      const badge = document.createElement("span");
      if (rec.valid) {
        badge.className = "badge badge-valid";
        badge.textContent = "صالحة";
      } else {
        badge.className = "badge badge-missing";
        badge.textContent = rec.coordsRaw ? "غير صالحة" : "مفقودة";
      }
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      // Row-level click opens the map for valid rows.
      if (rec.valid) {
        const url = mapUrl(rec.lat, rec.lng);
        tr.addEventListener("click", function () {
          window.open(url, "_blank", "noopener");
        });
      }

      frag.appendChild(tr);
    }

    tableBody.appendChild(frag);
  }

  function updateCounters() {
    const total = records.length;
    const valid = records.filter((r) => r.valid).length;
    totalCountEl.textContent = total;
    validCountEl.textContent = valid;
    missingCountEl.textContent = total - valid;
  }

  function applySearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderTable(records);
      return;
    }
    const filtered = records.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.coordsRaw.toLowerCase().includes(q)
    );
    renderTable(filtered);
  }

  function setStatus(msg, isError) {
    statusMsg.textContent = msg || "";
    statusMsg.classList.toggle("error", !!isError);
  }

  // ---- Clipboard + toast ---------------------------------------------------

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast("تم نسخ الرابط"),
        () => fallbackCopy(text)
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("تم نسخ الرابط");
    } catch (e) {
      showToast("تعذّر نسخ الرابط");
    }
    document.body.removeChild(ta);
  }

  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  // ---- File loading --------------------------------------------------------

  function handleFile(file) {
    if (!file) return;
    setStatus("جارٍ قراءة الملف…");

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        // header:1 => array of arrays; defval keeps empty cells aligned.
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        records = buildRecords(rows);
        afterLoad('تم تحميل الملف "' + file.name + '".');
      } catch (err) {
        console.error(err);
        setStatus(err.message || "تعذّرت قراءة الملف.", true);
      }
    };
    reader.onerror = function () {
      setStatus("حدث خطأ أثناء قراءة الملف.", true);
    };
    reader.readAsArrayBuffer(file);
  }

  function afterLoad(message) {
    updateCounters();
    searchInput.value = "";
    applySearch();
    exportBtn.disabled = records.length === 0;
    setStatus(message);
  }

  // ---- CSV export ----------------------------------------------------------

  function csvEscape(value) {
    const s = String(value === null || value === undefined ? "" : value);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportCsv() {
    if (!records.length) return;

    const header = ["الرقم", "الإحداثيات", "رابط الخرائط", "الحالة"];
    const lines = [header.map(csvEscape).join(",")];

    for (const r of records) {
      const link = r.valid ? mapUrl(r.lat, r.lng) : "";
      const status = r.valid ? "صالحة" : r.coordsRaw ? "غير صالحة" : "مفقودة";
      lines.push(
        [
          csvEscape(r.number),
          csvEscape(r.coordsRaw),
          csvEscape(link),
          csvEscape(status),
        ].join(",")
      );
    }

    // Prepend BOM so Excel reads Arabic/UTF-8 correctly.
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coordinates-cleaned.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("تم تصدير الملف");
  }

  // ---- Sample data (clearly marked as sample) ------------------------------

  function loadSample() {
    // NOTE: These are clearly-labelled SAMPLE rows for demonstration only.
    const sampleRows = [
      ["الرقم", "مكان العمل"],
      ["عينة-1", "25.3944761,49.5998724"],
      ["عينة-2", "25.465453613483355, 49.54283747363888"],
      ["عينة-3", ""],
      ["عينة-4", "25.380233,49.6020637"],
      ["عينة-5", "نص غير صالح"],
    ];
    records = buildRecords(sampleRows);
    afterLoad("تم تحميل بيانات العينة (للتجربة فقط).");
  }

  // ---- Events --------------------------------------------------------------

  fileInput.addEventListener("change", function (e) {
    handleFile(e.target.files[0]);
    // reset so selecting the same file again re-triggers change
    e.target.value = "";
  });

  loadSampleBtn.addEventListener("click", loadSample);
  exportBtn.addEventListener("click", exportCsv);
  searchInput.addEventListener("input", applySearch);

  // ---- Auto-load embedded data ---------------------------------------------
  // If the page ships with a built-in dataset (window.COORDINATES_DATA, a
  // 2-D array whose first row is the header), load it automatically so the
  // app is ready on open. Uploading a file later replaces this data.
  (function initEmbedded() {
    const data = window.COORDINATES_DATA;
    if (!Array.isArray(data) || data.length < 2) return;
    try {
      records = buildRecords(data);
      afterLoad("تم تحميل البيانات المضمّنة (" + records.length + " سجلًا).");
    } catch (err) {
      console.error(err);
      setStatus("تعذّر تحميل البيانات المضمّنة.", true);
    }
  })();
})();
