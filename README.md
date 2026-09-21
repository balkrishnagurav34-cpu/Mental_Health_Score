# Student Mental Health Score Predictor

A FastAPI backend serving a scikit-learn regression model, with a vanilla
HTML/CSS/JavaScript frontend. A student enters twelve everyday details —
age, country, study hours, sleep, social media habits, stress — and the
model returns a predicted mental health score.

---

## Project structure

```
project/
├── main.py                   # FastAPI app
├── Mentel_Health_Model.pkl   # trained sklearn Pipeline
└── frontend/
    ├── index.html            # markup and all input fields
    ├── style.css             # styles, responsive + dark scheme
    └── script.js             # form handling, fetch, dial animation
```

---

## Requirements

- Python 3.9 or newer
- `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `joblib`
- Any modern browser

Install:

```bash
pip install fastapi uvicorn scikit-learn pandas joblib
```

Use the same scikit-learn version the model was trained with. A mismatch
either raises a warning on load or silently changes predictions.

---

## Running it

**1. Start the backend** from the folder holding `main.py` and the `.pkl`:

```bash
uvicorn main:app --port 8000 --reload
```

Check it is alive at `http://127.0.0.1:8000/` — it should return the
welcome JSON. Interactive API docs sit at `http://127.0.0.1:8000/docs`.

**2. Open the frontend.** Double-click `index.html`, or serve it:

```bash
cd frontend
python -m http.server 5500
```

then visit `http://127.0.0.1:5500`.

CORS is already open on the backend (`allow_origins=["*"]`), so opening
the file directly works too.

---

## Configuration

One constant at the top of `script.js` controls where requests go:

```js
const API_BASE = "http://127.0.0.1:8000";
```

Change the port here if you start uvicorn on a different one. This is the
single most common reason the page shows a connection error.

The dial is scaled with:

```js
const SCORE_MIN = 0;
const SCORE_MAX = 10;
```

Adjust if your target variable uses a different range.

---

## API

### `GET /`

Health check. Returns a welcome object.

### `POST /predict`

Request body:

| Field | Type | Constraint |
|---|---|---|
| `Age` | int | 10–100 |
| `Gender` | str | Male, Female |
| `Country` | str | free text |
| `Academic_Level` | str | High School, Undergraduate, Graduate |
| `Most_Used_Platform` | str | Facebook, LinkedIn, Instagram, Snapchat, Twitter, YouTube, TikTok, LINE, KakaoTalk, VKontakte, WhatsApp, WeChat |
| `Purpose_Of_Use` | str | Networking, Education, Entertainment, News |
| `Avg_Daily_Usage_Hours` | float | 0–24 |
| `Daily_Unlocks` | int | ≥ 0 |
| `Study_Hours` | float | 0–24 |
| `Physical_Activity_Hours` | float | 0–20 |
| `Sleep_Hours_Per_Night` | float | 0–24 |
| `Stress_Level` | str | Low, Medium, High, Very High |

Example:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Age": 21,
    "Gender": "Male",
    "Country": "India",
    "Academic_Level": "Undergraduate",
    "Most_Used_Platform": "Instagram",
    "Purpose_Of_Use": "Entertainment",
    "Avg_Daily_Usage_Hours": 4,
    "Daily_Unlocks": 80,
    "Study_Hours": 5,
    "Physical_Activity_Hours": 1,
    "Sleep_Hours_Per_Night": 7,
    "Stress_Level": "Medium"
  }'
```

Response:

```json
{ "prediced_mental_health_score": 6.4 }
```

Note the spelling of the response key — the frontend reads it exactly as
the backend sends it.

The backend derives a thirteenth feature, `Grouped_country`: countries in
the `top_country` list pass through unchanged, everything else becomes
`"Other"`.

---

## Frontend behaviour

- All twelve model inputs, with key names and types matching the Pydantic
  model, so no translation layer is needed.
- Hour and unlock inputs are sliders with live value readouts; stress
  level is a chip selector.
- Four panel states: idle, loading, result, error.
- The score dial sweeps to its value and changes colour by band.
- A 422 from Pydantic is unpacked into readable `field: message` lines
  instead of a raw JSON dump.
- Responsive down to phone width, keyboard focus is visible, dark colour
  scheme is respected, and motion is reduced when the OS asks for it.

---

## Troubleshooting

**"Could not reach http://127.0.0.1:8000"** — uvicorn is not running, or
`API_BASE` does not match its port.

**500 on an unusual country** — if the pipeline's OneHotEncoder was fit
with `handle_unknown="error"`, a country the model never saw will raise.
Either restrict the country input to a `<select>` of the nine values in
`top_country`, or refit the encoder with `handle_unknown="ignore"`.

**422 Unprocessable Entity** — a value fell outside a Pydantic
constraint. The message on the page names the field.

**Model loads but predictions look wrong** — check that the scikit-learn
version matches the training environment, and that the column order and
names in `input_row` match what the pipeline was fit on.

---

## Disclaimer

This is an academic project built on survey data. The score is a
statistical estimate, not a diagnosis, and it should not be used to make
decisions about anyone's health.
