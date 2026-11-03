# Data preparation

Run this command from the repository root after downloading the Kaggle files:

```powershell
python scripts/preprocess.py
```

The script reads the raw CSV files in `data/raw/` and writes the browser-ready
dataset to `data/movies.json`.
