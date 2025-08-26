/**
 * Centralized configuration for overlay video files used in video compilation
 * This makes it easy to change file paths in the future
 * Supports any video format: MP4, MOV, AVI, WEBM, GIF, etc.
 */

export interface OverlayConfig {
  // Initial game ready video
  gameGetReady: string
  
  // Question-specific overlay videos (numbered)
  questionReady: (questionNumber: number) => string
  
  // Countdown and timing overlay videos
  timeStarts: string
  countdown: string
  timeUpFetching: string
  leaderboard: string
}

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  gameGetReady: '/files/game_get_ready.gif',
  
  questionReady: (questionNumber: number) => {
    const numberWords = [
      'one', 'two', 'three', 'four', 'five', 'six'
    ]
    const word = numberWords[questionNumber - 1] || questionNumber.toString()
    return `/files/question_${word}.gif`
  },
  
  timeStarts: '/files/question_time_starts.gif',
  countdown: '/files/question_countdown.gif',
  timeUpFetching: '/files/time_up_fetching.gif',
  leaderboard: '/files/question_leaderboard.gif'
}

/**
 * Get the current overlay configuration
 * This function allows for future customization or dynamic configuration
 */
export function getOverlayConfig(): OverlayConfig {
  return DEFAULT_OVERLAY_CONFIG
}

/**
 * Validate that all required overlay video files exist
 * This can be used for debugging and setup validation
 */
export async function validateOverlayFiles(maxQuestions: number = 6): Promise<{
  valid: boolean
  missing: string[]
  existing: string[]
}> {
  const config = getOverlayConfig()
  const filesToCheck = [
    config.gameGetReady,
    config.timeStarts,
    config.countdown,
    config.timeUpFetching,
    config.leaderboard
  ]
  
  // Add question-specific files
  for (let i = 1; i <= maxQuestions; i++) {
    filesToCheck.push(config.questionReady(i))
  }
  
  const existing: string[] = []
  const missing: string[] = []
  
  for (const file of filesToCheck) {
    try {
      const response = await fetch(file, { method: 'HEAD' })
      if (response.ok) {
        existing.push(file)
      } else {
        missing.push(file)
      }
    } catch {
      missing.push(file)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    existing
  }
}

/**
 * Get the complete video sequence for a given number of questions
 */
export function getVideoSequence(questionCount: number): Array<{
  type: 'overlay-video' | 'uploaded-video'
  source: string
  questionIndex?: number
  description: string
}> {
  const config = getOverlayConfig()
  const sequence = []
  
  // Initial game ready
  sequence.push({
    type: 'overlay-video' as const,
    source: config.gameGetReady,
    description: 'Game Get Ready'
  })
  
  // For each question
  for (let i = 1; i <= questionCount; i++) {
    // Question ready
    sequence.push({
      type: 'overlay-video' as const,
      source: config.questionReady(i),
      questionIndex: i,
      description: `Question ${i} Ready`
    })
    
    // Uploaded question video
    sequence.push({
      type: 'uploaded-video' as const,
      source: `question-${i}`,
      questionIndex: i,
      description: `Question ${i} Video`
    })
    
    // Time starts
    sequence.push({
      type: 'overlay-video' as const,
      source: config.timeStarts,
      questionIndex: i,
      description: 'Time Starts'
    })
    
    // Countdown
    sequence.push({
      type: 'overlay-video' as const,
      source: config.countdown,
      questionIndex: i,
      description: 'Countdown'
    })
    
    // Time up fetching
    sequence.push({
      type: 'overlay-video' as const,
      source: config.timeUpFetching,
      questionIndex: i,
      description: 'Time Up - Fetching Results'
    })
    
    // Leaderboard
    sequence.push({
      type: 'overlay-video' as const,
      source: config.leaderboard,
      questionIndex: i,
      description: 'Leaderboard/Results'
    })
  }
  
  return sequence
}
