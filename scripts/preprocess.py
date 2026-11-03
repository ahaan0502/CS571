"""Prepare the Kaggle TMDB files for the static D3 dashboard."""

import csv
import json
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUTPUT_PATH = ROOT / "data" / "movies.json"


def parse_json(value, fallback):
    try:
        return json.loads(value) if value else fallback
    except json.JSONDecodeError:
        return fallback


def season_for_month(month):
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Spring"
    if month in (6, 7, 8):
        return "Summer"
    return "Fall"


def budget_tier(budget):
    if budget < 5_000_000:
        return "Under $5M"
    if budget < 25_000_000:
        return "$5M–$25M"
    if budget < 50_000_000:
        return "$25M–$50M"
    if budget < 100_000_000:
        return "$50M–$100M"
    return "$100M+"


def outcome_for_roi(roi):
    if roi < 1:
        return "Loss"
    if roi <= 3:
        return "Modest return"
    return "Hit"


def read_credits():
    credits = {}
    path = RAW_DIR / "tmdb_5000_credits.csv"
    with path.open("r", encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            crew = parse_json(row["crew"], [])
            cast = parse_json(row["cast"], [])
            directors = [
                {"id": person.get("id"), "name": person.get("name")}
                for person in crew
                if person.get("job") == "Director"
            ]
            credits[row["movie_id"]] = {
                "directors": directors,
                "cast": [
                    {
                        "id": person.get("id"),
                        "name": person.get("name"),
                        "character": person.get("character"),
                        "order": person.get("order"),
                    }
                    for person in cast[:10]
                ],
            }
    return credits


def prepare_movies(credits):
    movies = []
    source_path = RAW_DIR / "tmdb_5000_movies.csv"
    with source_path.open("r", encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            budget = int(float(row["budget"] or 0))
            revenue = int(float(row["revenue"] or 0))
            release_date = row["release_date"] or ""

            # Zero budget/revenue values represent missing data in this dataset.
            if budget <= 0 or revenue <= 0 or not release_date:
                continue

            try:
                parsed_date = date.fromisoformat(release_date)
            except ValueError:
                continue

            roi = revenue / budget
            movie_credits = credits.get(row["id"], {"directors": [], "cast": []})
            genres = [genre["name"] for genre in parse_json(row["genres"], [])]
            directors = movie_credits["directors"]

            movies.append(
                {
                    "id": int(row["id"]),
                    "title": row["title"],
                    "releaseDate": release_date,
                    "releaseYear": parsed_date.year,
                    "releaseMonth": parsed_date.month,
                    "season": season_for_month(parsed_date.month),
                    "budget": budget,
                    "revenue": revenue,
                    # Keep full precision because the charts use logarithmic scales.
                    "roi": roi,
                    "profit": revenue - budget,
                    "outcome": outcome_for_roi(roi),
                    "budgetTier": budget_tier(budget),
                    "genres": genres,
                    "directors": directors,
                    "cast": movie_credits["cast"],
                    "voteAverage": float(row["vote_average"] or 0),
                    "voteCount": int(float(row["vote_count"] or 0)),
                    "runtime": int(float(row["runtime"] or 0)),
                    "originalLanguage": row["original_language"],
                }
            )
    return movies


def main():
    credits = read_credits()
    movies = prepare_movies(credits)
    payload = {
        "source": "TMDB 5000 Movie Dataset via Kaggle",
        "roiDefinition": "worldwide revenue / budget",
        "excludedRows": "Movies with zero or missing budget, revenue, or release date",
        "movies": movies,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Prepared {len(movies):,} movies -> {OUTPUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
