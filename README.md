# Movie ROI Explorer

An interactive D3.js dashboard for exploring which movie projects are most
likely to earn back their budget. The dashboard is designed for independent
film producers and can be hosted as a static site with GitHub Pages.

## Data source

The project uses the [TMDB 5000 Movie Dataset on Kaggle](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata):

- `tmdb_5000_movies.csv`
- `tmdb_5000_credits.csv`

Download both files from Kaggle and place them in `data/raw/`:

```text
data/raw/tmdb_5000_movies.csv
data/raw/tmdb_5000_credits.csv
```

The raw files are ignored by Git because they are source data rather than
browser assets. The generated `data/movies.json` file is the compact dataset
loaded by the dashboard.

## Prepare the data

From the repository root, run:

```powershell
python scripts/preprocess.py
```

The preprocessing step joins movies to credits, extracts genres, directors,
and the top-billed cast, and derives:

- ROI: worldwide revenue divided by budget
- Profit: worldwide revenue minus budget
- Release month, year, and season
- Five budget tiers
- Loss, modest-return, and hit outcome classes

Movies with missing or zero budget, revenue, or release date are excluded from
ROI analysis. Dollar values are nominal, and revenue represents box office
revenue only.

## Run locally

Because browsers restrict `fetch()` from local files, serve the repository with
a local web server. For example:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Dashboard views

- Genre ROI box plot: compares ROI distributions, medians, and outliers by
  genre on a logarithmic scale.
- Release timing heatmap: compares median ROI by release month and decade;
  cell labels show the number of qualifying films.
- Director and cast analysis: ranks directors by median ROI and shows film
  count, profitability rate, frequent cast collaborators, and film details.

The genre, budget tier, release season, and minimum-vote filters update the
summary cards and all visualizations together.

## GitHub Pages deployment

1. Push the repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Select the `main` branch and the repository root (`/`).
5. Save and open the published Pages URL after deployment completes.

The site uses relative asset paths and a D3.js CDN, so no build step or server
runtime is required for GitHub Pages.

## Project structure

```text
index.html              Dashboard page
css/styles.css          Layout and visualization styles
js/app.js               Shared state, filters, data loading, and KPIs
js/charts/              D3 visualization modules
data/movies.json        Generated browser-ready dataset
scripts/preprocess.py   Reproducible CSV preprocessing script
```
