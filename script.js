"use strict";

/* ---------- Config ---------- */
const API_BASE_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 15000;
const SCORE_MAX = 10; // Upper end of the score scale used for the gauge
const GAUGE_LENGTH = 2 * Math.PI * 54; // matches r="54" in index.html

/* ---------- Elements ---------- */
const form = document.getElementById("predictForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const resultCard = document.getElementById("result");
const gaugeFill = document.getElementById("gaugeFill");
const scoreValue = document.getElementById("scoreValue");
const scoreMax = document.getElementById("scoreMax");
const bandLabel = document.getElementById("bandLabel");
const bandText = document.getElementById("bandText");
const errorTitle = document.getElementById("errorTitle");
const errorText = document.getElementById("errorText");

scoreMax.textContent = `out of ${SCORE_MAX}`;

/* ---------- Validation rules (mirror the Pydantic model) ---------- */
const hours = { type: "float", min: 0, max: 24 };
const RULES = {
  age: { type: "int", min: 10, max: 100, label: "Age" },
  gender: { type: "choice", label: "Gender" },
  country: { type: "text", label: "Country" },
  academic_level: { type: "choice", label: "Academic level" },
  most_used_platform: { type: "choice", label: "Platform" },
  purpose_of_use: { type: "choice", label: "Purpose" },
  avg_daily_usage_hours: { ...hours, label: "Daily usage" },
  daily_unlocks: { type: "int", min: 0, label: "Daily unlocks" },
  study_hours: { ...hours, label: "Study hours" },
  physical_activity_hours: { ...hours, label: "Physical activity" },
  sleep_hours_per_night: { ...hours, label: "Sleep hours" },
  stress_level: { type: "choice", label: "Stress level" },
};

/* ---------- Helpers ---------- */
function getRawValue(name) {
  const els = form.elements[name];
  if (els instanceof RadioNodeList) return els.value; // radio group
  return els.value.trim();
}

function fieldWrapper(name) {
  const el = form.elements[name];
  const node = el instanceof RadioNodeList ? el[0] : el;
  return node.closest(".field");
}

function setFieldError(name, message) {
  const wrap = fieldWrapper(name);
  const slot = wrap.querySelector(`[data-error-for="${name}"]`);
  wrap.classList.toggle("invalid", Boolean(message));
  slot.textContent = message || "";
}

function clearErrors() {
  Object.keys(RULES).forEach((name) => setFieldError(name, ""));
}

function validateField(name) {
  const rule = RULES[name];
  const raw = getRawValue(name);

  if (raw === "") {
    return rule.type === "choice" ? "Please choose an option." : "This field is required.";
  }
  if (rule.type === "text") return "";

  if (rule.type === "int" || rule.type === "float") {
    const num = Number(raw);
    if (Number.isNaN(num)) return "Enter a valid number.";
    if (rule.type === "int" && !Number.isInteger(num)) return "Enter a whole number.";
    if (rule.min !== undefined && num < rule.min) return `Must be at least ${rule.min}.`;
    if (rule.max !== undefined && num > rule.max) return `Must be ${rule.max} or less.`;
  }
  return "";
}

function validateAll() {
  let firstInvalid = null;
  Object.keys(RULES).forEach((name) => {
    const message = validateField(name);
    setFieldError(name, message);
    if (message && !firstInvalid) firstInvalid = name;
  });
  return firstInvalid;
}

function buildPayload() {
  const payload = {};
  Object.entries(RULES).forEach(([name, rule]) => {
    const raw = getRawValue(name);
    payload[name] = rule.type === "int" || rule.type === "float" ? Number(raw) : raw;
  });
  return payload;
}

/* ---------- Result card states ---------- */
function setState(state) {
  resultCard.dataset.state = state;
}

function bandFor(score) {
  const ratio = score / SCORE_MAX;
  if (ratio >= 0.7) {
    return { label: "Strong wellbeing", color: "#b8f0cf", text: "This profile points to a healthy balance between screen time and daily life." };
  }
  if (ratio >= 0.5) {
    return { label: "Moderate wellbeing", color: "#ffe29a", text: "Some habits may be worth adjusting, such as sleep, activity or screen time." };
  }
  return { label: "Needs attention", color: "#ffc2b5", text: "This profile suggests risk. Consider talking with a counsellor or trusted adult." };
}

function showResult(score) {
  const band = bandFor(score);
  bandLabel.textContent = band.label;
  bandText.textContent = band.text;
  gaugeFill.style.stroke = band.color;
  setState("success");

  // Animate gauge and counter from zero
  gaugeFill.style.strokeDashoffset = GAUGE_LENGTH;
  const ratio = Math.min(Math.max(score / SCORE_MAX, 0), 1);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = GAUGE_LENGTH * (1 - ratio);
  }));

  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    scoreValue.textContent = (score * eased).toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
    else scoreValue.textContent = score.toFixed(2).replace(/0$/, "");
  }
  requestAnimationFrame(tick);
}

function showError(title, message, details = []) {
  errorTitle.textContent = title;
  errorText.textContent = message;
  errorText.querySelectorAll?.("ul").forEach((u) => u.remove());
  if (details.length) {
    const ul = document.createElement("ul");
    details.forEach((d) => {
      const li = document.createElement("li");
      li.textContent = d;
      ul.appendChild(li);
    });
    errorText.appendChild(ul);
  }
  setState("error");
}

/* ---------- API error handling ---------- */
// FastAPI returns 422 with: { detail: [{ loc: ["body", "field"], msg: "..." }] }
function handleValidationErrors(detail) {
  const general = [];
  let firstField = null;

  if (!Array.isArray(detail)) return { general: [String(detail)], firstField };

  detail.forEach((item) => {
    const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
    if (field && RULES[field]) {
      setFieldError(field, item.msg);
      if (!firstField) firstField = field;
    } else {
      general.push(item.msg || "Invalid input.");
    }
  });
  return { general, firstField };
}

async function requestPrediction(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let data = null;
    try { data = await response.json(); } catch { /* non-JSON body */ }

    if (!response.ok) {
      const err = new Error("API error");
      err.status = response.status;
      err.detail = data?.detail;
      throw err;
    }
    if (typeof data?.predicted_mental_health_score !== "number") {
      const err = new Error("Unexpected response");
      err.status = "shape";
      throw err;
    }
    return data.predicted_mental_health_score;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Events ---------- */
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const firstInvalid = validateAll();
  if (firstInvalid) {
    const el = form.elements[firstInvalid];
    (el instanceof RadioNodeList ? el[0] : el).focus();
    setState("idle");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add("loading");
  setState("loading");
  resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

  try {
    const score = await requestPrediction(buildPayload());
    showResult(score);
  } catch (err) {
    if (err.name === "AbortError") {
      showError("Request timed out", "The server took too long to respond. Please try again.");
    } else if (err.status === 422) {
      const { general, firstField } = handleValidationErrors(err.detail);
      showError("Check your inputs", "The server rejected some values. Fix the highlighted fields and try again.", general);
      if (firstField) {
        const el = form.elements[firstField];
        (el instanceof RadioNodeList ? el[0] : el).focus();
      }
    } else if (typeof err.status === "number" && err.status >= 500) {
      showError("Server error", "The model could not process this input. Check the backend terminal for details, then try again.");
    } else if (err.status) {
      showError("Unexpected response", `The API returned an unexpected result (${err.status}).`);
    } else {
      showError("Can't reach the API", `Make sure the backend is running at ${API_BASE_URL} (uvicorn main:app --reload).`);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
});

// Clear an error as soon as the user fixes the field
form.addEventListener("input", (event) => {
  const name = event.target.name;
  if (name && RULES[name] && fieldWrapper(name).classList.contains("invalid")) {
    setFieldError(name, validateField(name));
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  setState("idle");
});
