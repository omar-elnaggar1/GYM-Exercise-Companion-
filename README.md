# Gym Companion 🏋️

A personal gym tracker that lives **on your phone** and works **fully offline**.
No account, no server: all your data stays on the phone itself.

- **Today screen:** shows which session is next in your rotation (Upper → Lower → Rest → Push → Pull → Legs → Rest), whatever the weekday.
- **Workout logger:** sets are pre-filled from last time, so usually you just tap ✓. Every tap is saved instantly.
- **"Last time" + notes:** e.g. `Last: 60 kg × 9, 9, 8`, plus any note you left.
- **Progression:** when you hit the top of the rep range on every set, you'll see "⬆ Add weight today" (+2.5 kg barbell/machine/cable, +2 kg dumbbell, editable per exercise).
- **Rest timer:** starts when you tick a set (150 s for the first exercise, 90 s for the others). Has +15 s, −15 s and Skip, and beeps and vibrates when it ends.
- **Swap exercises:** pick an alternative for today only or permanently. History is kept per exercise.
- **Bodyweight log:** with a chart and 7-day average. **Calendar:** colored by session, with a streak counter. **Deload weeks:** suggested every 6–8 weeks. **Reminders.**
- **Export / Import:** back up all your data to a file.
- **Edit your training split:** reorder days, add or remove rest days, and create, rename or delete sessions.
- **Tutorial:** a guided tour with sample data that runs on first launch and then disappears.
- **Progress tab:** strength over time per exercise (estimated 1-rep max), personal records, biggest improvements and weekly volume.
- **Live PRs:** beat a record mid-workout and the set lights up 🏆 straight away.
- **Plate calculator:** editing a barbell set shows exactly which plates to load on each side.
- **Workout summary:** after Finish you see duration, sets, volume, new PRs and how it compares with last time.
- **Streak icon 🔥** at the top of the Today screen.
- **Edit past workouts** and **log a workout after the fact** (forgot your phone?) from the History tab.
- **Warm-up sets:** suggested ramp-up sets (with plates) before your first heavy lift.
- **Backup reminder:** a banner if you haven't exported a backup in 14 days.
- **Bar weight per exercise:** e.g. EZ bar 10 kg, bench 20 kg. The plate calculator and warm-ups use it.
- **kg or lb per exercise:** enter a machine's weight in pounds; it's saved and charted in kg.

---

## Part D first: put it online for free (GitHub Pages) ⭐

This is the main way to use the app. When you're done, the app lives on your phone and **does not need your PC or your home Wi‑Fi**. The internet address is only used to install the app and to fetch updates.

The repository already includes an automatic "build and publish" script (`.github/workflows/deploy.yml`). You only need to switch it on once:

1. **Make the repository public.** (GitHub Pages is free only for public repos. Only the *code* becomes public; your workouts stay on your phone and are never uploaded.)
   - Go to your repository on github.com → **Settings** (top tab) → scroll to the bottom ("Danger Zone") → **Change visibility** → **Public**.
2. **Turn on Pages:** **Settings** → **Pages** (left menu) → under "Build and deployment", set **Source** to **GitHub Actions**.
3. **Run the publish job:** click the **Actions** tab → click **Deploy to GitHub Pages** on the left → **Run workflow** → **Run workflow**. Wait about 1–2 minutes for the green ✓.
   - If it fails with an "environment protection" message: go to **Settings → Environments → github-pages**, and under "Deployment branches" add the branch `claude/busy-cray-iqozsh` (or merge the code into `main`). Then run it again.
4. Your app is now at:
   **https://omar-elnaggar1.github.io/GYM-Exercise-Companion-/**
   (The address is also shown on the **Settings → Pages** page.)

From now on, every time new code is pushed to `main` or to `claude/busy-cray-iqozsh`, the site updates by itself. The installed app picks up the new version the next time you open it with internet.

---

## C. Install it on your phone's home screen

Open the address from step D.4 **on your phone**, then:

### Android (Chrome)
1. Open the link in **Chrome**.
2. Tap the **⋮** menu (top right) → **Add to Home screen** (or **Install app**) → **Install**.
3. A "Gym" icon appears on your home screen. Open it from there.

### iPhone (Safari)
1. Open the link in **Safari** (not Chrome; iPhones only allow installing from Safari).
2. Tap the **Share** button (square with an arrow ↑) → scroll down → **Add to Home Screen** → **Add**.
3. Always open the app from the new home-screen icon.

**Test that it works offline:** open the app once, then turn on **airplane mode** and open it again. It should work normally. ✈️

> 💾 **Back up regularly:** your data lives only on the phone. If you delete the app, clear Safari/Chrome data, or lose the phone, the data is gone.
> Go to **Settings → Export** every week or two and save the file to Google Drive, iCloud Drive, or email it to yourself.
> To restore (on a new phone, for example): **Settings → Import** and pick that file.

---

## A. Run it on your computer (optional: only if you want to change the code)

You don't need this to use the app. It's only for trying out changes.

1. Install **Node.js** (the "LTS" version) from https://nodejs.org and accept all the defaults.
2. Download this project: on GitHub click the green **Code** button → **Download ZIP**, then unzip it. (Or `git clone` it if you know git.)
3. Open a terminal **in the project folder**:
   - Windows: open the folder in File Explorer, click the address bar, type `cmd` and press Enter.
   - Mac: right-click the folder → **New Terminal at Folder**.
4. Type these commands, pressing Enter after each one:
   ```
   npm install
   npm run dev
   ```
5. The terminal shows a link like `http://localhost:5173/`. Open it in your browser. Press `Ctrl + C` in the terminal to stop.

Other useful commands:
- `npm test` runs the automatic tests (progression, streak, deload, rotation, reminders).
- `npm run build` creates the final app in the `dist` folder.

## B. Open it on your phone

**The normal way:** use the GitHub Pages link from Part D. It works anywhere, with or without your PC.

**Only while developing** (phone and PC on the same Wi‑Fi): `npm run dev` also prints a `Network:` address such as `http://192.168.1.20:5173/`. Typing it into your phone's browser shows the in-progress version.
⚠️ This is just for testing changes. It stops working when your PC is off, and data entered there is separate from your installed app. Don't log real workouts this way.

---

## Reminders: what works on Android vs iPhone

Turn them on in **Settings → Reminders**, choose a time, and tap **Allow** for notifications.

| | Android (Chrome) | iPhone |
|---|---|---|
| Yellow banner in the app after your reminder time | ✅ | ✅ |
| Phone notification | ✅ when the app is open or was used recently | ✅ only on iOS 16.4+ **and** only when installed to the Home Screen (Part C) |
| Notification at the exact time with the app fully closed | ❌ | ❌ |
| Rest-timer vibration | ✅ | ❌ (Apple doesn't allow vibration from web apps) |

**Why no reminder when the app is closed?** A web app with no server can't wake itself up at a set time. That needs either a server sending "push" messages or a native App Store app. If you want a guaranteed nudge, set a normal phone alarm as well.

**Rest timer tip:** "Keep screen on during workout" (on by default) stops the screen from sleeping, so the countdown, beep and vibration always happen. If you lock the phone, the timer keeps counting correctly but can only beep once you're back in the app.

---

## The tutorial 🎓

The first time you open the app, a 13-step tour walks you through the Today screen, logging a workout, the rest timer, swaps and notes, the calendar and streak, bodyweight, and the split editor.

- It runs on **sample data** (about 6 weeks of made-up workouts and weigh-ins), kept in a separate on-phone database. Your real data is never touched.
- Tap **Finish** (or **Skip** at any point) and the sample data is deleted. The app reloads, empty and ready for you.
- Replay it any time: **Settings → Help → Show the tutorial**.

## Changing your training split

**Settings → Edit training split**:
- **Days:** use ▲ ▼ to reorder, ✕ to remove, and **+ Add a day** to add a session or a rest day. "▶ up next" shows which day the app will give you next.
- **Sessions:** **+ New session** creates one (e.g. "Arms") with a name and calendar color, then takes you straight to adding its exercises. **Edit** renames or recolors a session, and **Delete** removes it from the split (past workouts stay in your history).
- **Restore my original split** puts back Upper / Lower / Rest / Push / Pull / Legs / Rest.

To change the exercises inside a session (sets, reps, rest time, weight jump), use **Exercises** on a session, or **Settings → Edit session exercises**.

## Progress & personal records 📈

- **Estimated 1-rep max (e1RM)** is how the app compares sets with different weights and reps. It uses the Epley formula, so 60 kg × 10 ≈ 80 kg. The chart shows your best e1RM each session, which means you can see progress even when you add reps rather than weight.
- **Bodyweight moves** (pull-ups, dips…) are tracked by reps until you add weight. **Timed holds** (plank) are tracked by seconds.
- **A PR is counted** when you beat your best e1RM or lift a heavier weight than ever. Your first session of an exercise is the baseline, and deload weeks are ignored.
- Tap any exercise in "Recent PRs", "Biggest improvements" or "All personal records" to see its chart. Tap the chart to read any session.
- **Plate calculator:** set your bar weight in **Settings → Plate calculator** (default 20 kg).

## Pounds (lb) and bar weights

- **Machines in pounds:** when you edit a set, tap **lb** above the weight. Type the number shown on the machine, and the app shows the kg equivalent ("= 45.4 kg") and saves it in kg. That exercise stays in lb from then on: sets, "Last time" and the "+ weight" suggestion all show lb, and the weight jump becomes 5 lb. Tap **kg** to switch back.
- **Progress, PRs, History totals and volume are always in kg**, so everything is comparable.
- **Bar weight per exercise:** in the set editor of a barbell lift, tap **Bar: 20 kg ✎** and pick the bar (20 / 15 / 10 / 7.5 / 5 kg, or 45 / 35 / 25 / 15 lb). It's remembered for that exercise. You can also set it in **Edit session exercises**. EZ-bar exercises start at 10 kg.
- **Settings → Plate calculator** sets the default bar for exercises that don't have their own. A barbell lift switched to lb uses a 45 lb bar and lb plates (45 / 35 / 25 / 10 / 5 / 2.5).

## Fixing and adding past workouts

- **Edit:** History → tap a workout → **✏️ Edit workout**. You can change any set (tap it), tick or untick sets, swap exercises, change the date, and add notes. "Last time" and records only compare with workouts *before* that one.
- **Log a past workout:** History → **+ Log a past workout**. Pick the date and session, then enter the sets (they're pre-filled from your previous session; tap **✓ Tick all sets** if you did them as planned).
  - Leave "Count it in my rotation" on if it replaced a planned session, so "next session" moves on.
  - If you leave without ticking anything, the app offers to delete the empty workout.

## Backups

Your data lives only on your phone. If you haven't exported in **14 days**, the Today screen shows a 💾 banner. **Back up now** opens the share sheet, so you can save to Files, Google Drive or iCloud, or email it to yourself. **Later** hides it for 3 days. **Settings → Backup** shows when you last backed up.

## How the rotation works

- A **training session waits for you**: if Push is next and you skip the gym for 3 days, it's still Push.
- A **rest day lasts one calendar day** and then moves on by itself.
- Finishing a workout makes the next session due **tomorrow** (today shows "Done for today ✅").
- **Training on a rest day** ("Train anyway") does the next session and skips the rest day.
- If the app gets out of step with you, fix it in **Settings → Rotation → Next session**.

**Streak** = planned sessions completed in a row without missing a training day. Rest days in the rotation never break it, and today never counts as missed (you still have time).

**Deload:** counting starts with your first workout. After 6 weeks (or 7–8, set in Settings) the Today screen suggests a deload week.
- **Start deload:** for 7 days, workouts get about half the sets at about 90% of the weight. Your normal "last time" numbers are kept for afterwards.
- **Skip:** the count restarts from today.

**Notes on your program:** "Barbell **or** dumbbell bench press", "Barbell **or** chest-supported row" and "Pull-ups **or** lat pulldown" are set up as the first option, with the other option one tap away under **⇄ Swap**. Use "Permanently" to make it your default.

---

## Project structure (for the curious)

```
src/
  db/          types.ts (data shapes), seed.ts (your program + alternatives),
               demo.ts (tutorial sample data), db.ts (on-phone database + tutorial mode),
               actions.ts (start/finish/swap/backup/split editing)
  logic/       pure functions + tests: rotation, progression, streak, deload, reminders,
               progress (e1RM, PRs, volume), plates, warmup, backup, units (kg/lb)
  screens/     Today, Workout, Progress, History, Body, Settings, SplitEditor, TemplateEditor
  components/  RestTimer, Stepper, Sheet, NoteField, WeightChart, LineChart, BarChart, Tour (tutorial)
.github/workflows/deploy.yml   auto-publish to GitHub Pages
```

Built with React, Vite, TypeScript and Dexie (IndexedDB), using vite-plugin-pwa for offline support.
