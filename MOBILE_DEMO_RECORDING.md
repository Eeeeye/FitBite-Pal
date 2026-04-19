# FitBite Pal Mobile Demo Recording Guide

## Summary

- Target format: `Android real device`, `5-7 minutes`, `single-take if possible`, `operation + subtitles`.
- Main story: `Register -> Onboarding -> Training -> Pose -> Food Recognition -> Meal Logging -> Progress`.
- Recording strategy: use a fresh account throughout; do not rely on admin pages or historical datasets.

## Pre-Recording Checklist

1. Start the backend and verify `http://<your-ip>:8080/api/actuator/health`.
2. Confirm the phone and backend host are on the same Wi-Fi.
3. Set the app server address before recording.
4. Clear the app login state so the video starts from the splash or register flow.
5. Put one clean food photo in the phone gallery for the recognition segment.
6. Rehearse the complete flow once before the final take.

## Recommended Script

### 0:00-0:20 App launch

Subtitle:
`FitBite Pal combines personalized training, diet management, and progress tracking in one mobile app.`

### 0:20-0:55 Register

- Open the register page.
- Enter a prepared username, email, and password.
- Submit and wait for onboarding.

Subtitle:
`New users can register directly on mobile and enter a guided personalization flow.`

### 0:55-1:45 Onboarding

- Complete gender, age, height, weight, goal, activity level, and training duration.
- Finish onboarding and enter the main app.

Subtitle:
`The app uses the user profile to generate personalized training and nutrition plans.`

### 1:45-2:30 Home / plan overview

- Pause on the home screen.
- Show the daily training card, calories target, and bottom tabs.

Subtitle:
`The home screen surfaces the current plan and key entry points.`

### 2:30-3:20 Training and pose

- Open one exercise detail page.
- Enter pose recognition.
- Grant camera permission if prompted.
- Start a short session, wait for visible state change or feedback, then end the session.

Subtitle:
`The training module supports exercise details and real-time pose guidance.`

### 3:20-4:15 Diet and food recognition

- Switch to the diet tab.
- Open food recognition.
- Choose the prepared image from the gallery.
- Wait for the recognition result.

Subtitle:
`The diet module can analyze food images and estimate nutrition data.`

### 4:15-4:50 Save meal

- Pick the meal type.
- Save the result as a diet record.
- Return to the diet screen and show the new item.

Subtitle:
`Recognition results can be converted directly into meal records.`

### 4:50-5:35 Progress

- Open the progress screen.
- Show the current metrics, charts, and target progress.

Subtitle:
`The progress module tracks the user journey as more check-ins, meals, and workouts are completed.`

### 5:35-6:00 Closing

- Return to home or diet for a stable closing frame.

Subtitle:
`FitBite Pal delivers a full loop from onboarding to execution and data tracking.`

## Recording Notes

- Prefer gallery-based food recognition over live shooting for a more stable take.
- Keep the narration generic around AI results so backend fallback remains acceptable during recording.
- If the progress page has little data, frame it as a fresh-user dashboard ready to accumulate more history.
- If a segment stalls, stop the take and restart from the beginning rather than patching over obvious hesitation.

## Rehearsal Pass Criteria

- Registration succeeds and enters onboarding.
- Onboarding completion enters the main app.
- Home screen loads a training plan.
- Pose recognition can enter, start, and stop without crashing.
- Food recognition returns a result and saves a meal entry.
- Progress screen renders without blank-page or error states.
