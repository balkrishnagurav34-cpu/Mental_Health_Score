/* ============================================================
   Student Wellbeing Check — front-end logic
   Talks to the FastAPI backend: POST {API_BASE}/predict
   ============================================================ */

/* Change this if you start uvicorn on a different port. */
const API_BASE = "https://mental-health-score-q6t1.onrender.com";

/* The model's target range, used only for the dial. */
const SCORE_MIN = 0;
const SCORE_MAX = 10;

/* Semicircle length for r=120  ->  PI * 120 */
const ARC_LENGTH = 377;

/* ------------------------------------------------------------
   Element handles
   ------------------------------------------------------------ */
const form          = document.getElementById("predictForm");
const submitBtn     = document.getElementById("submitBtn");
const resetBtn      = document.getElementById("resetBtn");
const formStatus    = document.getElementById("formStatus");

const dial          = document.getElementById("dial");
const dialFill      = document.getElementById("dialFill");
const scoreValue    = document.getElementById("scoreValue");

const readoutIdle   = document.getElementById("readoutIdle");
const readoutLoad   = document.getElementById("readoutLoading");
const readoutResult = document.getElementById("readoutResult");
const readoutError  = document.getElementById("readoutError");
const scoreBand     = document.getElementById("scoreBand");
const scoreNote     = document.getElementById("scoreNote");
const errorNote     = document.getElementById("errorNote");

/* Fields that need live number readouts next to their label. */
const SLIDERS = [
  "Avg_Daily_Usage_Hours",
  "Daily_Unlocks",
  "Study_Hours",
  "Physical_Activity_Hours",
  "Sleep_Hours_Per_Night"
];

/* ------------------------------------------------------------
   Live slider labels
   ------------------------------------------------------------ */
function syncSlider(input) {
  const out = document.getElementById("out_" + input.id);
  if (!out) return;

  const unit = input.dataset.unit || "";
  const step = parseFloat(input.step);
  const val  = parseFloat(input.value);

  out.textContent = (Number.isInteger(step) ? val : val.toFixed(1)) + unit;
}

SLIDERS.forEach(function (id) {
  const input = document.getElementById(id);
  if (!input) return;
  syncSlider(input);
  input.addEventListener("input", function () { syncSlider(input); });
});

/* ------------------------------------------------------------
   Collect + validate the payload
   Keys and types match the StudentData Pydantic model exactly.
   ------------------------------------------------------------ */
function buildPayload() {
  const get = (id) => document.getElementById(id).value.trim();
  const num = (id) => parseFloat(document.getElementById(id).value);

  return {
    Age:                     parseInt(get("Age"), 10),
    Gender:                  get("Gender"),
    Country:                 get("Country"),
    Academic_Level:          get("Academic_Level"),
    Most_Used_Platform:      get("Most_Used_Platform"),
    Purpose_Of_Use:          get("Purpose_Of_Use"),
    Avg_Daily_Usage_Hours:   num("Avg_Daily_Usage_Hours"),
    Daily_Unlocks:           parseInt(get("Daily_Unlocks"), 10),
    Study_Hours:             num("Study_Hours"),
    Physical_Activity_Hours: num("Physical_Activity_Hours"),
    Sleep_Hours_Per_Night:   num("Sleep_Hours_Per_Night"),
    Stress_Level:            (form.querySelector('input[name="Stress_Level"]:checked') || {}).value
  };
}

function validate(payload) {
  const ageInput     = document.getElementById("Age");
  const countryInput = document.getElementById("Country");

  ageInput.removeAttribute("aria-invalid");
  countryInput.removeAttribute("aria-invalid");

  if (!Number.isFinite(payload.Age) || payload.Age < 10 || payload.Age > 100) {
    ageInput.setAttribute("aria-invalid", "true");
    ageInput.focus();
    return "Age has to be between 10 and 100.";
  }

  if (!payload.Country) {
    countryInput.setAttribute("aria-invalid", "true");
    countryInput.focus();
    return "Add a country — the model uses it as a feature.";
  }

  if (!payload.Stress_Level) {
    return "Pick a stress level.";
  }

  return null;
}

/* ------------------------------------------------------------
   Panel states: idle / loading / result / error
   ------------------------------------------------------------ */
function setState(state) {
  dial.dataset.state = state;

  readoutIdle.hidden   = state !== "idle";
  readoutLoad.hidden   = state !== "loading";
  readoutResult.hidden = state !== "result";
  readoutError.hidden  = state !== "error";

  submitBtn.disabled   = state === "loading";
  submitBtn.textContent = state === "loading" ? "Working…" : "Get my score";
}

/* ------------------------------------------------------------
   Dial + wording for a score
   ------------------------------------------------------------ */
function bandFor(score) {
  if (score >= 7.5) {
    return {
      color: "var(--sage)",
      band:  "Holding up well",
      note:  "Your sleep, study and screen balance line up with the healthier end of the training data. Keep the routine that got you here."
    };
  }
  if (score >= 5) {
    return {
      color: "var(--sage-deep)",
      band:  "Mostly steady",
      note:  "A middling score. Small shifts — an earlier phone cut-off, half an hour more sleep — move this band the most."
    };
  }
  if (score >= 3) {
    return {
      color: "var(--amber)",
      band:  "Under strain",
      note:  "Screen time, sleep or stress is pulling the estimate down. Try changing one of the three and run it again."
    };
  }
  return {
    color: "var(--brick)",
    band:  "Running low",
    note:  "The pattern you entered sits at the low end of the data. Worth talking to a friend, family member or campus counsellor."
  };
}

function renderScore(score) {
  const clamped = Math.min(Math.max(score, SCORE_MIN), SCORE_MAX);
  const ratio   = (clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const info    = bandFor(clamped);

  dial.style.setProperty("--dial", info.color);
  dialFill.style.strokeDashoffset = String(ARC_LENGTH * (1 - ratio));

  scoreValue.textContent = score.toFixed(1);
  scoreBand.textContent  = info.band;
  scoreNote.textContent  = info.note;

  setState("result");
}

function resetDial() {
  dialFill.style.strokeDashoffset = String(ARC_LENGTH);
  dial.style.setProperty("--dial", "var(--sage)");
  scoreValue.textContent = "—";
  setState("idle");
}

/* ------------------------------------------------------------
   Read FastAPI's error shape into one readable line
   ------------------------------------------------------------ */
function describeError(status, body) {
  if (body && Array.isArray(body.detail)) {
    return body.detail
      .map(function (d) {
        const field = (d.loc || []).filter(function (p) { return p !== "body"; }).join(".");
        return field ? field + ": " + d.msg : d.msg;
      })
      .join(" · ");
  }
  if (body && typeof body.detail === "string") return body.detail;
  return "The server replied with status " + status + ".";
}

/* ------------------------------------------------------------
   Submit
   ------------------------------------------------------------ */
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  formStatus.textContent = "";

  const payload = buildPayload();
  const problem = validate(payload);

  if (problem) {
    formStatus.textContent = problem;
    return;
  }

  setState("loading");

  try {
    const response = await fetch(API_BASE + "/predict", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });

    let body = null;
    try { body = await response.json(); } catch (_) { /* non-JSON reply */ }

    if (!response.ok) {
      errorNote.textContent = describeError(response.status, body);
      setState("error");
      return;
    }

    const score = Number(body.prediced_mental_health_score);

    if (!Number.isFinite(score)) {
      errorNote.textContent = "The reply did not contain a score.";
      setState("error");
      return;
    }

    renderScore(score);

    if (window.matchMedia("(max-width: 899px)").matches) {
      dial.scrollIntoView({ behavior: "smooth", block: "center" });
    }

  } catch (err) {
    errorNote.textContent =
      "Could not reach " + API_BASE + ". Check that uvicorn is running and that the port here matches it.";
    setState("error");
  }
});

/* ------------------------------------------------------------
   Reset
   ------------------------------------------------------------ */
resetBtn.addEventListener("click", function () {
  formStatus.textContent = "";
  window.setTimeout(function () {
    SLIDERS.forEach(function (id) {
      const input = document.getElementById(id);
      if (input) syncSlider(input);
    });
    resetDial();
  }, 0);
});

/* Start clean. */
resetDial();
