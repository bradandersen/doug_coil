"use strict";

const SWITCHES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];

const SAMPLE = {
  A: "60",
  B: "29.78",
  C: "16.07",
  D: "8.02",
  E: "4.01",
  F: "1.97",
  G: "0.99",
  H: "0.504",
  I: "0.2522",
  J: "0.1243",
  K: "0.0635",
  L: "0.03406",
  M: "0.022",
  N: "0.01019",
  O: "0.00787",
  P: "0.00526"
};

const STORAGE_KEY = "doug-coil-v1";
const HOT_PERCENT = 0.6;
const MAX_ROWS = 2000;

const el = (id) => document.getElementById(id);

function parseNum(raw) {
  if (typeof raw !== "string") return NaN;
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  let text = trimmed.replace(/\s/g, "");
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

function neededUf(freqHz, coilMh) {
  const omega = 2 * Math.PI * freqHz;
  return 1e9 / (omega * omega * coilMh);
}

function coilMhFrom(capUf, freqHz) {
  const omega = 2 * Math.PI * freqHz;
  return 1e9 / (capUf * omega * omega);
}

function formatUf(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(5);
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 10) return value.toFixed(2) + "%";
  if (abs >= 1) return value.toFixed(3) + "%";
  return value.toFixed(4) + "%";
}

function formatHz(value) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function formatMeasure(value) {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(5)));
}

function readCaps() {
  return SWITCHES.map((id) => {
    const input = el("cap-" + id);
    const uf = parseNum(input.value);
    return { id, uf, input };
  });
}

function followingSums(caps) {
  const sums = new Array(caps.length).fill(0);
  let running = 0;
  for (let i = caps.length - 1; i >= 0; i -= 1) {
    sums[i] = running;
    if (Number.isFinite(caps[i].uf) && caps[i].uf > 0) running += caps[i].uf;
  }
  return sums;
}

function solve(needed, caps) {
  let remaining = needed;
  const chosen = [];
  let available = 0;
  for (const cap of caps) {
    const on = Number.isFinite(cap.uf) && cap.uf > 0 && remaining > cap.uf;
    if (on) {
      remaining -= cap.uf;
      available += cap.uf;
      chosen.push(cap.id);
    }
  }
  const percent = needed > 0 ? ((needed - available) / needed) * 100 : NaN;
  return {
    chosen,
    available,
    percent,
    shortfall: needed - available
  };
}

function sweepSpec() {
  const from = parseNum(el("sweepFrom").value);
  const to = parseNum(el("sweepTo").value);
  const step = parseNum(el("sweepStep").value);
  if (!(from > 0) || !(to > 0) || !(step > 0) || to < from) {
    return { error: "Set a start, an end at or above the start, and a step above zero." };
  }
  const count = Math.floor((to - from) / step + 1e-9) + 1;
  if (count > MAX_ROWS) {
    return { error: "That step would list " + count + " rows. Narrow the range or use a larger step." };
  }
  const freqs = [];
  for (let i = 0; i < count; i += 1) {
    freqs.push(Math.round((from + i * step) * 1e6) / 1e6);
  }
  return { freqs };
}

function loadStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return false;
    if (typeof saved.coil === "string") el("coil").value = saved.coil;
    if (typeof saved.freq === "string") el("freq").value = saved.freq;
    if (saved.caps && typeof saved.caps === "object") {
      for (const id of SWITCHES) {
        if (typeof saved.caps[id] === "string") el("cap-" + id).value = saved.caps[id];
      }
    }
    if (typeof saved.sweepFrom === "string") el("sweepFrom").value = saved.sweepFrom;
    if (typeof saved.sweepTo === "string") el("sweepTo").value = saved.sweepTo;
    if (typeof saved.sweepStep === "string") el("sweepStep").value = saved.sweepStep;
    if (typeof saved.knownCap === "string") el("knownCap").value = saved.knownCap;
    if (typeof saved.knownFreq === "string") el("knownFreq").value = saved.knownFreq;
    return true;
  } catch (err) {
    return false;
  }
}

function saveStorage() {
  const caps = {};
  for (const id of SWITCHES) caps[id] = el("cap-" + id).value;
  const data = {
    coil: el("coil").value,
    freq: el("freq").value,
    caps,
    sweepFrom: el("sweepFrom").value,
    sweepTo: el("sweepTo").value,
    sweepStep: el("sweepStep").value,
    knownCap: el("knownCap").value,
    knownFreq: el("knownFreq").value
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (announceSave) el("saveNote").textContent = "Saved in this browser.";
  } catch (err) {
    el("saveNote").textContent = "This browser is not storing the measurements.";
  }
}

let lastFreq = null;
let copyLabelTimer = 0;
let announceSave = false;

function render() {
  const coil = parseNum(el("coil").value);
  const freq = parseNum(el("freq").value);
  const caps = readCaps();
  const sums = followingSums(caps);
  const coilOk = coil > 0;
  const freqOk = freq > 0;
  const ready = coilOk && freqOk;
  const needed = ready ? neededUf(freq, coil) : NaN;
  const solution = ready ? solve(needed, caps) : null;
  const on = new Set(solution ? solution.chosen : []);

  let total = 0;
  caps.forEach((cap, index) => {
    const valid = Number.isFinite(cap.uf);
    cap.input.setAttribute("aria-invalid", valid && cap.uf >= 0 ? "false" : "true");
    el("sum-" + cap.id).textContent = index === caps.length - 1 ? "—" : formatUf(sums[index]);
    const state = el("state-" + cap.id);
    const lit = on.has(cap.id);
    state.textContent = lit ? "On" : "Off";
    state.classList.toggle("on", lit);
    el("card-" + cap.id).classList.toggle("on", lit);
    if (valid && cap.uf > 0) total += cap.uf;
  });
  el("bankTotal").textContent = "Switches A through P add up to " + formatUf(total) + " µF.";

  const chips = el("chips");
  chips.replaceChildren();
  for (const cap of caps) {
    const chip = document.createElement("div");
    chip.className = "chip" + (on.has(cap.id) ? " on" : "");
    chip.setAttribute("role", "listitem");
    const letter = document.createElement("span");
    letter.className = "letter";
    letter.textContent = cap.id;
    const uf = document.createElement("span");
    uf.className = "uf";
    uf.textContent = Number.isFinite(cap.uf) ? formatMeasure(cap.uf) : "—";
    chip.append(letter, uf);
    chips.append(chip);
  }

  const warn = el("warn");
  if (!ready) {
    el("needed").textContent = "—";
    el("available").textContent = "—";
    el("shortfall").textContent = "—";
    el("percent").textContent = "—";
    el("neededNote").textContent = "Enter a coil size and a frequency above zero.";
    el("turnOn").textContent = "";
    el("nearby").hidden = true;
    warn.hidden = true;
  } else {
    el("needed").textContent = formatUf(needed);
    el("available").textContent = formatUf(solution.available);
    el("shortfall").textContent = formatUf(solution.shortfall);
    el("percent").textContent = formatPct(solution.percent);
    el("neededNote").textContent = formatHz(freq) + " Hz · " + formatMeasure(coil) + " mH coil";
    el("turnOn").textContent = solution.chosen.length
      ? "Turn on " + solution.chosen.join(" ")
      : "No switch is smaller than the capacitance this frequency needs.";
    const hot = solution.percent > HOT_PERCENT;
    warn.hidden = !hot;
    warn.textContent = hot
      ? "This is more than 0.6% off. At 1.5 V or 15 A that heats the capacitor, the amp, and the coil. 1.3 V or 13 A runs cooler."
      : "";
    suggestNearby(freq, solution.percent, coil, caps);
  }

  renderSweep(freq, coil, caps, ready);
  renderCoilMeasure();
  document.title = ready ? formatHz(freq) + " Hz · Doug Coil Calculator" : "Doug Coil Calculator";
  saveStorage();
}

function suggestNearby(freq, percent, coil, caps) {
  const spec = sweepSpec();
  const note = el("nearby");
  note.hidden = true;
  note.replaceChildren();
  if (spec.error) return;
  let best = null;
  for (const gridFreq of spec.freqs) {
    if (Math.abs(gridFreq - freq) < 1e-9 || Math.abs(gridFreq - freq) > 25) continue;
    const row = solve(neededUf(gridFreq, coil), caps);
    if (!best || row.percent < best.percent) best = { freq: gridFreq, percent: row.percent, switches: row.chosen.join("") };
  }
  if (!best || percent - best.percent < 0.05) return;
  note.hidden = false;
  note.append(document.createTextNode("Within 25 Hz, "));
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = formatHz(best.freq) + " Hz";
  button.addEventListener("click", () => {
    el("freq").value = formatHz(best.freq);
    render();
  });
  note.append(button);
  note.append(document.createTextNode(" is " + formatPct(best.percent) + " off (" + (best.switches || "none") + ")."));
}

function renderSweep(freq, coil, caps, ready) {
  const spec = sweepSpec();
  const body = el("sweepBody");
  const note = el("sweepNote");
  const scroller = el("sweepScroll");
  const kept = scroller.scrollTop;
  body.replaceChildren();
  if (spec.error) {
    note.textContent = spec.error;
    return;
  }
  note.textContent = spec.freqs.length + " frequencies.";
  if (!ready) return;

  let nearest = 0;
  let nearestDist = Infinity;
  spec.freqs.forEach((gridFreq, index) => {
    const dist = Math.abs(gridFreq - freq);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = index;
    }
  });

  const fragment = document.createDocumentFragment();
  spec.freqs.forEach((gridFreq, index) => {
    const rowNeed = neededUf(gridFreq, coil);
    const rowSolve = solve(rowNeed, caps);
    const tr = document.createElement("tr");
    if (index === nearest) tr.classList.add("active");
    if (rowSolve.percent > HOT_PERCENT) tr.classList.add("hot");
    tr.dataset.freq = String(gridFreq);
    const cells = [
      formatHz(gridFreq),
      formatUf(rowNeed),
      formatUf(rowSolve.available),
      formatPct(rowSolve.percent),
      rowSolve.chosen.join("") || "—"
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    fragment.append(tr);
  });
  body.append(fragment);

  if (freq !== lastFreq) {
    const active = body.querySelector(".active");
    if (active) {
      const delta = active.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTop += delta - 42;
    }
    lastFreq = freq;
  } else {
    scroller.scrollTop = kept;
  }
}

function renderCoilMeasure() {
  const cap = parseNum(el("knownCap").value);
  const freq = parseNum(el("knownFreq").value);
  const out = el("coilOut");
  const button = el("useCoil");
  if (cap > 0 && freq > 0) {
    const mh = coilMhFrom(cap, freq);
    out.textContent = formatMeasure(mh);
    button.disabled = false;
    button.dataset.mh = formatMeasure(mh);
  } else {
    out.textContent = "—";
    button.disabled = true;
    delete button.dataset.mh;
  }
}

function buildBank() {
  const grid = el("bankGrid");
  for (const id of SWITCHES) {
    const card = document.createElement("div");
    card.className = "switch-card";
    card.id = "card-" + id;
    const top = document.createElement("div");
    top.className = "switch-top";
    const letter = document.createElement("span");
    letter.className = "letter";
    letter.textContent = id;
    const state = document.createElement("span");
    state.className = "state";
    state.id = "state-" + id;
    state.textContent = "Off";
    top.append(letter, state);
    const input = document.createElement("input");
    input.id = "cap-" + id;
    input.setAttribute("inputmode", "decimal");
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Switch " + id + " microfarads");
    input.value = SAMPLE[id];
    const sum = document.createElement("p");
    sum.className = "sum";
    sum.append(document.createTextNode("Sum after "));
    const sumValue = document.createElement("span");
    sumValue.id = "sum-" + id;
    sum.append(sumValue);
    card.append(top, input, sum);
    grid.append(card);
    input.addEventListener("input", render);
  }
}

function applySample() {
  el("coil").value = "8.81";
  el("freq").value = "230";
  el("sweepFrom").value = "230";
  el("sweepTo").value = "3500";
  el("sweepStep").value = "5";
  for (const id of SWITCHES) el("cap-" + id).value = SAMPLE[id];
  lastFreq = null;
  render();
}

function shiftFreq(delta) {
  const current = parseNum(el("freq").value);
  const next = (Number.isFinite(current) ? current : 0) + delta;
  el("freq").value = formatHz(next > 0 ? next : delta);
  render();
}

function init() {
  buildBank();
  const restored = loadStorage();
  render();
  el("saveNote").textContent = restored
    ? "Restored your capacitor values from this browser."
    : "Type your measured microfarads. They are stored in this browser.";
  announceSave = true;

  for (const id of ["coil", "freq", "sweepFrom", "sweepTo", "sweepStep", "knownCap", "knownFreq"]) {
    el(id).addEventListener("input", render);
  }
  el("freqSteps").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.dataset.delta == null) return;
    shiftFreq(Number(button.dataset.delta));
  });
  el("resetBank").addEventListener("click", applySample);
  el("useCoil").addEventListener("click", () => {
    if (!el("useCoil").dataset.mh) return;
    el("coil").value = el("useCoil").dataset.mh;
    render();
  });
  el("sweepBody").addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    if (!row || !row.dataset.freq) return;
    el("freq").value = row.dataset.freq;
    render();
  });
  el("copySwitches").addEventListener("click", async () => {
    const text = el("turnOn").textContent.replace(/^Turn on\s*/, "");
    if (!text || text.startsWith("No switch")) return;
    try {
      await navigator.clipboard.writeText(text);
      el("copySwitches").textContent = "Copied";
      clearTimeout(copyLabelTimer);
      copyLabelTimer = setTimeout(() => {
        el("copySwitches").textContent = "Copy switches";
      }, 1200);
    } catch (err) {
      el("copySwitches").textContent = text;
    }
  });
}

init();
