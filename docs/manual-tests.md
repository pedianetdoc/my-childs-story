# Manual tests

Checks that cannot be automated (spec section 7). Use **fictional stories only**.
Record date, browser/version, device and result for each run.

## Voice dictation (spec 4.2)

The dictation controller is unit-tested with a fake recognition object
(`client/src/voice/dictationController.test.ts`, `client/src/voice.test.tsx`).
Real speech recognition needs these browser checks.

### AC-08 — dictation works and never submits

Run on **Chrome desktop**, **Chrome Android** and **Safari iOS**.

1. Open the app. Confirm the "Start speaking" button is visible.
2. Type one sentence in the story box.
3. Press **Start speaking**; allow the microphone. Confirm "Listening…" appears.
4. Speak two fictional sentences. Confirm words appear first in the lighter
   interim line, then are added to the end of the story box after a space.
5. Confirm the `X / 5000` counter increases.
6. Stay silent for 10–15 seconds, then speak again. Confirm listening continued
   (still "Listening…") and the new words are added.
7. Edit a word in the story box while listening; speak again. Confirm the edit
   is kept and new words are appended.
8. Press **Stop**. Confirm "Listening…" disappears.
9. Confirm nothing was organized automatically: the start screen is still shown
   and Organize My Story has not run.

| Date | Browser / device | Result | Notes |
|---|---|---|---|
| | Chrome desktop | | |
| | Chrome Android | | |
| | Safari iOS | | |

### AC-09 — unsupported browser and denied permission

1. **Firefox**: open the app. Confirm no microphone button and the message
   "Voice input isn't available in this browser; please type." Type a story;
   confirm typing works normally.
2. **Chrome, permission denied**: block the microphone for the site, press
   **Start speaking**. Confirm the friendly message explaining how to allow the
   microphone, and that typed text is unchanged and typing still works.

| Date | Browser / device | Result | Notes |
|---|---|---|---|
| | Firefox (no support) | | |
| | Chrome (denied) | | |

### AC-10 — Taglish with en-PH and fil-PH

1. Choose **English (Philippines)**. Read the fictional Taglish story below aloud.
2. Clear the story. Choose **Filipino**. Read the same story aloud.
3. In both cases confirm the transcript can be corrected in the story box before
   pressing Organize My Story.
4. Note mis-recognized words for the report. No accuracy threshold is claimed.

Fictional script: "Nag-aalala ako kasi konti pa lang ang words niya. He loves
puzzles. Minsan tinuturo niya yung gusto niya. Sabi ng lola niya hindi siya
masyadong nakikipaglaro sa mga pinsan niya."

| Date | Browser / device | Language | Word-error notes |
|---|---|---|---|
| | | en-PH | |
| | | fil-PH | |
