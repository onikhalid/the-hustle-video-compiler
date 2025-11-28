/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Production-ready timestamp system for real-time streaming and game session management
 * Designed for mu38 pseudo streaming with precise timing for interactive UI synchronization
 */

export interface GameEvent {
  id: string
  type: 'game_start' | 'question_ready' | 'question_start' | 'question_end' | 'time_starts' | 'countdown_start' | 'countdown_tick' | 'time_up' | 'results_start' | 'results_end' | 'game_end'
  timestamp: number // Absolute timestamp in milliseconds from video start
  duration: number // Duration of this event in milliseconds
  questionNumber?: number // Question number (1-based) if applicable
  metadata?: {
    questionId?: string
    countdownValue?: number // Current countdown value for countdown_tick events
    isLastQuestion?: boolean
    totalQuestions?: number
    [key: string]: any
  }
}

export interface GameSession {
  sessionId: string
  videoId: string
  totalDuration: number // Total video duration in milliseconds
  questionCount: number
  events: GameEvent[]
  createdAt: string // ISO timestamp
  version: string // Timestamp format version for compatibility
}

export interface StreamingContext {
  sessionId: string
  currentTime: number // Current playback time in milliseconds
  joinTime: number // When the player joined (absolute timestamp)
  videoStartTime: number // When the video started playing (absolute timestamp)
  isLive: boolean // Whether this is a live session
}

export class ProductionTimestampManager {
  private events: GameEvent[] = []
  private sessionId: string
  private videoId: string
  private totalDuration: number = 0
  private questionCount: number = 0

  constructor(sessionId: string, videoId: string) {
    this.sessionId = sessionId
    this.videoId = videoId
  }

  /**
   * Generate comprehensive timestamps for a game session
   */
  generateTimestamps(
    questionVideos: Array<{ duration: number; id: string }>,
    timingConfig: {
      gameReadyDuration: number
      questionReadyDuration: number
      timeStartsDuration: number
      countdownDuration: number
      timeUpFetchingDuration: number
      leaderboardDuration: number
    }
  ): GameSession {
    this.events = []
    this.questionCount = questionVideos.length
    let currentTime = 0

    // Game start event
    this.addEvent({
      id: this.generateEventId('game_start'),
      type: 'game_start',
      timestamp: currentTime,
      duration: timingConfig.gameReadyDuration * 1000,
      metadata: {
        totalQuestions: this.questionCount,
        videoId: this.videoId
      }
    })

    currentTime += timingConfig.gameReadyDuration * 1000

    // Process each question
    questionVideos.forEach((video, index) => {
      const questionNumber = index + 1
      const isLastQuestion = questionNumber === this.questionCount

      // Question ready event
      this.addEvent({
        id: this.generateEventId('question_ready', questionNumber),
        type: 'question_ready',
        timestamp: currentTime,
        duration: timingConfig.questionReadyDuration * 1000,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      currentTime += timingConfig.questionReadyDuration * 1000

      // Question start event
      this.addEvent({
        id: this.generateEventId('question_start', questionNumber),
        type: 'question_start',
        timestamp: currentTime,
        duration: video.duration * 1000,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      currentTime += video.duration * 1000

      // Question end event
      this.addEvent({
        id: this.generateEventId('question_end', questionNumber),
        type: 'question_end',
        timestamp: currentTime,
        duration: 0,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      // Time starts event
      this.addEvent({
        id: this.generateEventId('time_starts', questionNumber),
        type: 'time_starts',
        timestamp: currentTime,
        duration: timingConfig.timeStartsDuration * 1000,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      currentTime += timingConfig.timeStartsDuration * 1000

      // Countdown events
      const countdownStart = currentTime
      this.addEvent({
        id: this.generateEventId('countdown_start', questionNumber),
        type: 'countdown_start',
        timestamp: currentTime,
        duration: timingConfig.countdownDuration * 1000,
        questionNumber,
        metadata: {
          questionId: video.id,
          countdownValue: timingConfig.countdownDuration,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      // Generate countdown tick events for each second
      for (let tick = timingConfig.countdownDuration; tick > 0; tick--) {
        const tickTime = countdownStart + (timingConfig.countdownDuration - tick) * 1000
        this.addEvent({
          id: this.generateEventId('countdown_tick', questionNumber, tick),
          type: 'countdown_tick',
          timestamp: tickTime,
          duration: 1000,
          questionNumber,
          metadata: {
            questionId: video.id,
            countdownValue: tick,
            isLastQuestion,
            totalQuestions: this.questionCount
          }
        })
      }

      currentTime += timingConfig.countdownDuration * 1000

      // Time up event
      this.addEvent({
        id: this.generateEventId('time_up', questionNumber),
        type: 'time_up',
        timestamp: currentTime,
        duration: timingConfig.timeUpFetchingDuration * 1000,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      currentTime += timingConfig.timeUpFetchingDuration * 1000

      // Results events
      this.addEvent({
        id: this.generateEventId('results_start', questionNumber),
        type: 'results_start',
        timestamp: currentTime,
        duration: timingConfig.leaderboardDuration * 1000,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })

      currentTime += timingConfig.leaderboardDuration * 1000

      this.addEvent({
        id: this.generateEventId('results_end', questionNumber),
        type: 'results_end',
        timestamp: currentTime,
        duration: 0,
        questionNumber,
        metadata: {
          questionId: video.id,
          isLastQuestion,
          totalQuestions: this.questionCount
        }
      })
    })

    // Game end event
    this.addEvent({
      id: this.generateEventId('game_end'),
      type: 'game_end',
      timestamp: currentTime,
      duration: 0,
      metadata: {
        totalQuestions: this.questionCount,
        videoId: this.videoId
      }
    })

    this.totalDuration = currentTime

    return {
      sessionId: this.sessionId,
      videoId: this.videoId,
      totalDuration: this.totalDuration,
      questionCount: this.questionCount,
      events: this.events,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  /**
   * Get events that should be triggered at a specific time
   */
  getEventsAtTime(timestamp: number, tolerance: number = 100): GameEvent[] {
    return this.events.filter(event => 
      Math.abs(event.timestamp - timestamp) <= tolerance
    )
  }

  /**
   * Get the current active event at a specific time
   */
  getCurrentEvent(timestamp: number): GameEvent | null {
    return this.events.find(event => 
      timestamp >= event.timestamp && 
      timestamp < event.timestamp + event.duration
    ) || null
  }

  /**
   * Get events for a specific question
   */
  getQuestionEvents(questionNumber: number): GameEvent[] {
    return this.events.filter(event => event.questionNumber === questionNumber)
  }

  /**
   * Get the next event after a specific timestamp
   */
  getNextEvent(timestamp: number): GameEvent | null {
    return this.events.find(event => event.timestamp > timestamp) || null
  }

  /**
   * Calculate what should be displayed when a player joins at a specific time
   */
  getJoinContext(joinTime: number, videoStartTime: number): {
    currentEvent: GameEvent | null
    nextEvent: GameEvent | null
    timeInCurrentEvent: number
    shouldShowQuestion: boolean
    questionNumber?: number
  } {
    const currentVideoTime = joinTime - videoStartTime
    const currentEvent = this.getCurrentEvent(currentVideoTime)
    const nextEvent = this.getNextEvent(currentVideoTime)
    const timeInCurrentEvent = currentEvent ? currentVideoTime - currentEvent.timestamp : 0

    return {
      currentEvent,
      nextEvent,
      timeInCurrentEvent,
      shouldShowQuestion: currentEvent?.type === 'question_start' || false,
      questionNumber: currentEvent?.questionNumber
    }
  }

  private addEvent(event: Omit<GameEvent, 'id'> & { id: string }) {
    this.events.push(event)
  }

  private generateEventId(type: string, questionNumber?: number, tick?: number): string {
    const parts = [this.sessionId, type]
    if (questionNumber) parts.push(`q${questionNumber}`)
    if (tick !== undefined) parts.push(`t${tick}`)
    return parts.join('_')
  }

  /**
   * Export timestamps in various formats for different use cases
   */
  exportTimestamps(format: 'json' | 'srt' | 'vtt' | 'csv' | 'xml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify({
          sessionId: this.sessionId,
          videoId: this.videoId,
          totalDuration: this.totalDuration,
          questionCount: this.questionCount,
          events: this.events,
          createdAt: new Date().toISOString(),
          version: '1.0.0'
        }, null, 2)
      
      case 'srt':
        return this.generateSRT()
      
      case 'vtt':
        return this.generateVTT()
      
      case 'csv':
        return this.generateCSV()
      
      case 'xml':
        return this.generateXML()
      
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  private generateSRT(): string {
    return this.events.map((event, index) => {
      const start = this.formatSRTTime(event.timestamp)
      const end = this.formatSRTTime(event.timestamp + event.duration)
      return `${index + 1}\n${start} --> ${end}\n${event.type}${event.questionNumber ? ` (Q${event.questionNumber})` : ''}\n`
    }).join('\n')
  }

  private generateVTT(): string {
    const header = 'WEBVTT\n\n'
    const cues = this.events.map(event => {
      const start = this.formatVTTTime(event.timestamp)
      const end = this.formatVTTTime(event.timestamp + event.duration)
      return `${start} --> ${end}\n${event.type}${event.questionNumber ? ` (Q${event.questionNumber})` : ''}\n`
    }).join('\n')
    return header + cues
  }

  private generateCSV(): string {
    const header = 'ID,Type,Timestamp,Duration,QuestionNumber,Metadata\n'
    const rows = this.events.map(event => 
      `${event.id},${event.type},${event.timestamp},${event.duration},${event.questionNumber || ''},${JSON.stringify(event.metadata || {})}`
    ).join('\n')
    return header + rows
  }

  private generateXML(): string {
    const events = this.events.map(event => `
    <event>
      <id>${event.id}</id>
      <type>${event.type}</type>
      <timestamp>${event.timestamp}</timestamp>
      <duration>${event.duration}</duration>
      ${event.questionNumber ? `<questionNumber>${event.questionNumber}</questionNumber>` : ''}
      ${event.metadata ? `<metadata>${JSON.stringify(event.metadata)}</metadata>` : ''}
    </event>`).join('')
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<gameSession>
  <sessionId>${this.sessionId}</sessionId>
  <videoId>${this.videoId}</videoId>
  <totalDuration>${this.totalDuration}</totalDuration>
  <questionCount>${this.questionCount}</questionCount>
  <events>${events}
  </events>
</gameSession>`
  }

  private formatSRTTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const milliseconds = ms % 1000
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
  }

  private formatVTTTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const milliseconds = ms % 1000
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
  }
}
