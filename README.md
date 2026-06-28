# عارض الإحداثيات — Coordinates Viewer

A clean, browser-only viewer for customer/supplier work locations. Load an
Excel (`.xlsx`) or CSV file of records, view them in a searchable table, and
open each coordinate directly in Google Maps. The interface is fully Arabic
and RTL-friendly.

**No backend, no database — everything runs in the browser.**

## ▶️ Ready-to-use link (data embedded)

The app ships with the full dataset **embedded directly inside `index.html`**, so
it loads automatically with no upload step. Open it directly here:

```
https://raw.githack.com/qw1qw66-sudo/coordinates/main/index.html
```

Uploading an Excel/CSV file at any time **replaces** the embedded data in that
session. To refresh the built-in data, regenerate the
`window.COORDINATES_DATA` `<script>` block inside `index.html` from your latest
source file (see [Updating the embedded data](#updating-the-embedded-data)).

---

## Features

- 📤 Upload `.xlsx`, `.xls`, or `.csv` files (parsed with [SheetJS / xlsx](https://sheetjs.com/)).
- 🔎 Automatic detection of the Arabic headers **`الرقم`** (number) and **`مكان العمل`** (coordinates).
- 🗺️ Every valid coordinate becomes a clickable Google Maps link using
  `https://www.google.com/maps?q=LATITUDE,LONGITUDE`.
- 🖱️ Click the number, the coordinates, the row, or the map button to open Maps in a new tab.
- ✅ Coordinate validation (latitude −90…90, longitude −180…180), with or without a space after the comma.
- 🚫 Empty coordinates show **"لا توجد إحداثيات"** and the map link is disabled.
- 🔢 Search by number or coordinate.
- 📊 Counters: total records, valid coordinates, missing coordinates.
- 📋 Copy the Google Maps link button (**"نسخ الرابط"**).
- 💾 Export the cleaned list as CSV (UTF-8 with BOM so Excel reads Arabic correctly).
- 📱 Simple, fast, mobile-friendly, RTL Arabic layout.

---

## Expected data format

The first sheet should contain two columns:

| الرقم | مكان العمل |
| ----- | ----------------------- |
| 129   | 25.3944761,49.5998724   |
| 139   | 25.465453, 49.542837    |
| 146   | *(empty → no coords)*   |

- The coordinate column holds `latitude, longitude`. A space after the comma is optional.
- If the Arabic headers are not found, the app falls back to using the **first column as the number** and the **second column as the coordinates**.

---

## Run locally

Because the app is plain static files, you only need to serve the folder
(opening `index.html` directly works too, but a local server avoids any
browser file-access restrictions).

```bash
# Option 1 — Python (built in on most systems)
python3 -m http.server 8000
# then open http://localhost:8000

# Option 2 — Node
npx serve .
```

You can also just **double-click `index.html`** to open it in your browser,
then click **"تجربة بيانات عينة"** to load demo data.

---

## Deploy to GitHub Pages

This repo includes a workflow at `.github/workflows/deploy.yml` that publishes
the site automatically.

1. Push the project to GitHub (default branch, e.g. `main`).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to the default branch — the workflow deploys the static files.
5. Your site will be available at `https://<username>.github.io/<repo>/`.

### Manual alternative (no Actions)

In **Settings → Pages**, set **Source = Deploy from a branch**, pick your
default branch and the `/ (root)` folder, then save. GitHub serves the site
from the repository root.

> No build step is required — the app is pure HTML/CSS/JS and loads the
> `xlsx` library from a CDN.

---

## Project structure

```
coordinates/
├── index.html   # markup + Arabic UI text
├── styles.css   # RTL, mobile-friendly styling
├── app.js       # parsing, validation, search, export logic
├── README.md
└── .github/workflows/deploy.yml   # GitHub Pages deployment
```

---

## Updating the embedded data

The built-in records live in a `window.COORDINATES_DATA` `<script>` block near
the bottom of `index.html`. It is a 2-D array whose **first row is the header**
(`["الرقم", "مكان العمل"]`), matching the structure of an uploaded sheet, so the
same parsing/validation logic handles both.

To refresh it from a new source file, replace that array with rows in the same
`[number, "lat,lng"]` shape (use `""` for missing coordinates). Any valid
Excel/CSV can also just be uploaded in the UI without touching the code.

---

## Privacy & data

No data is uploaded anywhere. Files you load are parsed entirely in your
browser. The only sample data included (**"تجربة بيانات عينة"**) is clearly
marked as sample/demo content.
