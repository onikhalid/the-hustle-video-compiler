# Required Overlay Video Files for Video Compilation

This directory should contain the following overlay video files for the video compilation process.
**Supports any video format**: MP4, MOV, AVI, WEBM, GIF, etc.

## Initial Game Ready
- `game_get_ready.gif` - Shown at the very beginning of the compilation

## Question Ready Videos (numbered)
- `question_one.gif` - Shown before question 1
- `question_two.gif` - Shown before question 2
- `question_three.gif` - Shown before question 3
- `question_four.gif` - Shown before question 4
- `question_five.gif` - Shown before question 5
- `question_six.gif` - Shown before question 6

## Timing and Countdown Videos
- `question_time_starts.gif` - Shown after each question video, before countdown
- `question_countdown.gif` - Countdown timer video
- `time_up_fetching.gif` - Shown when time is up, fetching results
- `question_leaderboard.gif` - Results/leaderboard display

## Video Sequence
For each question, the sequence is:
1. Question Ready Video (question_<number>.gif)
2. Uploaded question video
3. Time Starts Video (question_time_starts.gif)
4. Countdown Video (question_countdown.gif)
5. Time Up Fetching Video (time_up_fetching.gif)
6. Leaderboard Video (question_leaderboard.gif)

## File Requirements
- **Any video format supported**: MP4, MOV, AVI, WEBM, GIF, etc.
- Recommended resolution: 1920x1080 or higher
- Files should be optimized for web delivery
- Duration can be controlled via the app settings

## Format Examples
You can use any combination of formats:
- `game_get_ready.mp4`
- `question_one.mov`
- `question_countdown.gif`
- `question_leaderboard.webm`

## Customization
To change the file paths or names, edit the configuration in `lib/overlay-config.ts`
