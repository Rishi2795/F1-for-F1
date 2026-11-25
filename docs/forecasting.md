# Forecasting: how it is trained, tested and deployed

## What it predicts

- **Race odds** (win, podium, points finish, retirement) for every race still to come.
- **Championship odds** for drivers and constructors, by simulating the races still to come.
- Before qualifying and after qualifying: once a race weekend's qualifying is in (`python -m f1data enrich`), the
  forecast for that race switches to the variant that also uses the grid and the qualifying gap.

## The model

1. **Strengths.** Each driver gets a strength from: the rating engine's driver skill plus car strength; the team's recent
   race pace (the "current car condition"); recent form; and, after qualifying, the grid slot and qualifying gap.
2. **Odds.** A Plackett-Luce model turns strengths into finishing-order odds. Weights are fitted by maximum likelihood on
   past finishing orders. One temperature scale, chosen on the top three places of training races only, sharpens the front.
3. **Retirements.** A per-driver chance from the driver's and the team's recent record, shrunk towards a 10% prior.
4. **Simulation.** Each race is simulated 20,000 times (Gumbel noise on strengths, which is exactly Plackett-Luce).
5. **Title odds.** The remaining races are simulated with one shared shift per team and per driver, so cars can change
   between rounds. The size of that shift is chosen on the tuning seasons.

## How it is tested

- Settings (memory lengths, title uncertainty) are chosen on **2021 to 2023 only**.
- The model is scored on **2024 onward**. Each test season's forecast uses weights fitted on earlier seasons only
  (an expanding window), so nothing from the future leaks in. A unit test checks that features never see their own race.
- Variants are compared on the same races: ratings only, plus recent pace, plus recent form, grid only, and so on.
- Scores: winner log loss (against a random pick), podium Brier score, retirement Brier score, a calibration table,
  and title forecasts against "the points leader wins".

## Retraining and deploying

```bash
cd pipeline && python -m f1data predict      # fit, backtest, publish (about 35 s)
python -m f1data validate                    # probabilities add up, files complete
```

`predict` writes `predictions/{next,championship,review,model}.json`. The scheduled refresh retrains after every new
race. The model card (`model.json`) holds the weights, the settings, the fingerprint of the training data and the scores.

## Honest limits

Retirements are close to unpredictable. Upgrades and damage are invisible until they show up in a race. Sprint points
are not simulated. Weather, safety cars and strategy are part of the uncertainty. The test set is small (about 70 races).
