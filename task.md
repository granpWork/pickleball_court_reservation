# Task List

- [x] **Generate CSV Match Result per Game in Match Matrix**:
  - Add a "CSV" button to each individual game card inside round `n` in the Open Play Match Matrix.
  - Enable CSV export button ONLY when the game status is `completed` (disable if scheduled or in-progress).
  - Show team final score on the match card when completed (`Final Score: Red X - Y Blue`).
  - Disable Delete button on match card when the game status is `completed`.
  - Filename format: `game2_<team_red>_vs_<team_blue>_<date>.csv` (e.g. `game2_Bryan_Alizza_Mae_Joven_vs_John_Michael_Matubis_Tristan_jude_Osea_2026-10-09.csv`).
