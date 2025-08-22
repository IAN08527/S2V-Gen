// src/processors/ttsProcessor.js

const fs = require("fs").promises;
const path = require("path");
const { fileURLToPath } = require("url");
const gtts = require("gtts");
const { spawn, execFile } = require("child_process");
const util = require("util");
const execFilePromise = util.promisify(execFile);

// Configuration and state
const config = {
  defaultLanguage: "en",
  defaultSlow: false,
  wordsPerMinute: 150,
  sampleRate: 22050,
  audioFormat: "mp3",
  maxRetries: 3,
  retryDelay: 1000,
};

let sessionState = {
  processedAudio: new Set(),
  sessionId: null,
  tempDir: null,
  totalAudioDuration: 0,
};

/**
 * Generate unique session ID for file organization
 */
function generateSessionId() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "").slice(0, 15);
}

/**
 * Initialize session and create temp directory
 */
async function initializeSession() {
  if (!sessionState.sessionId) {
    sessionState.sessionId = generateSessionId();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    sessionState.tempDir = path.join(
      "W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp",
    );

    try {
      await fs.access(sessionState.tempDir);
      console.log(`📁 Using temp directory: ${sessionState.tempDir}`);
      return sessionState;
    } catch (error) {
      try {
        await fs.mkdir(sessionState.tempDir, { recursive: true });
        console.log(`📁 Created temp directory: ${sessionState.tempDir}`);
        return sessionState;
      } catch (error) {
        console.error("❌ Failed to create/access temp directory:", error);
        throw error;
      }
    }
  }
  return sessionState; // Ensure sessionState is returned if already initialized
}

/**
 * Main function to process TTS for all scenes
 * @param {Array} scenes - Array of processed scenes from textProcessor
 * @param {Object} options - Processing options
 * @returns {Object} Processed scenes with audio data
 */
async function processSceneAudio(scenes, options = {}) {
  console.log("🎙️  Starting TTS processing...");

  if (!sessionState.sessionId) {
    await initializeSession();
  }

  const processingConfig = {
    language: options.language || config.defaultLanguage,
    slow: options.slow || config.defaultSlow,
    voiceSpeed: options.voiceSpeed || 1.0,
    sceneDuration: options.sceneDuration || 6,
    enableSilencePadding: options.enableSilencePadding !== false,
    audioQuality: options.audioQuality || "standard",
    ...options,
  };

  try {
    const processedScenes = [];

    scenes.map(async (scene, i) => {
      console.log(`\n🎤 Processing audio for Scene ${scene.id}...`);

      let audioResult = await generateAudioForScene(scene, processingConfig);
      let optimizedAudio = await optimizeAudioTiming(
        audioResult,
        scene,
        processingConfig
      );

      const sceneWithAudio = {
        ...scene,
        audio: optimizedAudio,
        estimatedSpeechTime: optimizedAudio.duration,
        paddingNeeded: Math.max(
          0,
          processingConfig.sceneDuration - optimizedAudio.duration
        ),
      };

      processedScenes.push(sceneWithAudio);
      sessionState.totalAudioDuration += optimizedAudio.duration;

      // Add delay between generations to avoid rate limiting
      if (i < scenes.length - 1) {
        await delay(config.retryDelay);
      }
    });

    return {
      success: true,
      totalScenesProcessed: processedScenes.length,
      totalAudioDuration:
        Math.round(sessionState.totalAudioDuration * 100) / 100,
      averageAudioDuration:
        Math.round(
          (sessionState.totalAudioDuration / processedScenes.length) * 100
        ) / 100,
      sessionId: sessionState.sessionId,
      tempDirectory: sessionState.tempDir,
      scenes: processedScenes,
      metadata: {
        language: processingConfig.language,
        voiceSpeed: processingConfig.voiceSpeed,
        audioFormat: config.audioFormat,
        sampleRate: config.sampleRate,
        totalFilesGenerated: processedScenes.length,
        failedGenerations: processedScenes.filter((s) => s.audio.error).length,
      },
    };
  } catch (error) {
    console.error("❌ TTS processing failed:", error);
    return {
      success: false,
      error: error.message,
      scenes: scenes.map((scene) => ({
        ...scene,
        audio: {
          error: "TTS processing failed",
          duration: 0,
          filePath: null,
        },
      })),
    };
  }
}

/**
 * Generate audio for a single scene
 * @param {Object} scene - Scene object from textProcessor
 * @param {Object} config - Processing configuration
 * @returns {Object} Audio generation result
 */
async function generateAudioForScene(scene, config) {
  try {
    // Clean and prepare text for TTS
    const cleanedText = cleanTextForTTS(scene.text);

    if (!cleanedText.trim()) {
      throw new Error(`Scene ${scene.id}: No valid text found for TTS`);
    }

    // Generate filename
    const audioFileName = `scene_${scene.id}_audio.${
      config.audioFormat || "mp3"
    }`;
    const audioPath = path.join(sessionState.tempDir, audioFileName);

    console.log(`  📝 Text length: ${cleanedText.length} characters`);
    console.log(`  🎯 Target: "${cleanedText.substring(0, 50)}..."`);

    // Generate TTS with retry logic
    let audioGenerated = false;
    let lastError = null;

    for (let attempt = 1; attempt <= 1; attempt++) {
      try {
        await generateWithGTTS(cleanedText, audioPath, config);
        audioGenerated = true;
        break;
      } catch (error) {
        lastError = error;
        console.log(
          `  ⚠️  Attempt ${attempt}/${config.maxRetries} failed: ${error.message}`
        );

        if (attempt < config.maxRetries) {
          await delay(config.retryDelay * attempt);
        }
      }
    }

    if (!audioGenerated) {
      throw (
        lastError || new Error("Failed to generate audio after all retries")
      );
    }

    // Verify file was created and has content
    const stats = await fs.stat(audioPath);
    if (stats.size === 0) {
      throw new Error(`Generated audio file is empty for scene ${scene.id}`);
    }

    // Get actual audio duration
    const actualDuration = await getAudioDuration(audioPath);

    console.log(
      `  ✅ Generated: ${audioFileName} (${formatFileSize(
        stats.size
      )}, ${actualDuration.toFixed(1)}s)`
    );

    sessionState.processedAudio.add(scene.id);

    return {
      success: true,
      filePath: audioPath,
      fileName: audioFileName,
      fileSize: stats.size,
      duration: actualDuration,
      estimatedDuration: estimateAudioDurationFromText(cleanedText),
      cleanedText: cleanedText,
      originalTextLength: scene.text.length,
      generatedAt: new Date().toISOString(),
      language: config.language,
      audioFormat: config.audioFormat || "mp3",
      sampleRate: config.sampleRate,
    };
  } catch (error) {
    console.error(
      `  ❌ Failed to generate audio for scene ${scene.id}:`,
      error.message
    );

    return {
      success: false,
      error: error.message,
      filePath: null,
      fileName: null,
      fileSize: 0,
      duration: 0,
      estimatedDuration: estimateAudioDurationFromText(scene.text),
      generatedAt: new Date().toISOString(),
      fallbackUsed: true,
    };
  }
}

/**
 * Generate TTS using Google Text-to-Speech
 * @param {string} text - Text to convert
 * @param {string} outputPath - Output file path
 * @param {Object} options - TTS options
 * @returns {Promise<void>}
 */
function generateWithGTTS(text, outputPath, options) {
  return new Promise((resolve, reject) => {
    try {
      console.log("\n🎙️ TTS Generation Details:");
      console.log("📝 Input Text:", text);
      console.log("📂 Output Path:", outputPath);
      console.log("🔧 Options:", JSON.stringify(options, null, 2));

      const gttsInstance = new gtts(
        text,
        options.language || "en",
        options.slow || false
      );

      gttsInstance.save(outputPath, (error) => {
        if (error) {
          console.error("❌ Save Error:", error);
          reject(new Error(`TTS Generation failed: ${error.message}`));
          return;
        }

        // Verify file was created
        fs.access(outputPath, fs.constants.F_OK, (err) => {
          if (err) {
            console.error("❌ File Access Error:", err);
            reject(new Error(`File creation failed: ${err.message}`));
            return;
          }

          console.log("✅ Audio file generated successfully!");
          console.log("📍 Location:", outputPath);
          resolve();
        });
      });
    } catch (error) {
      console.error("❌ Initialization Error:", error);
      reject(error);
    }
  });
}

/**
 * Optimize audio timing to match scene duration requirements
 * @param {Object} audioResult - Audio generation result
 * @param {Object} scene - Scene object
 * @param {Object} config - Processing configuration
 * @returns {Object} Optimized audio result
 */
async function optimizeAudioTiming(audioResult, scene, config) {
  if (!audioResult.success) {
    return audioResult;
  }

  const targetDuration = config.sceneDuration || 6;
  const actualDuration = audioResult.duration;
  const tolerance = 0.5; // 500ms tolerance

  let optimizationApplied = "none";
  let finalDuration = actualDuration;

  // Check if audio duration is significantly different from target
  if (Math.abs(actualDuration - targetDuration) > tolerance) {
    if (actualDuration > targetDuration + tolerance) {
      // Audio too long - note for potential trimming in video processor
      optimizationApplied = "trim-needed";
      console.log(
        `  ⚠️  Audio longer than target (${actualDuration.toFixed(
          1
        )}s vs ${targetDuration}s)`
      );
    } else if (actualDuration < targetDuration - tolerance) {
      // Audio too short - will need silence padding in video processor
      optimizationApplied = "padding-needed";
      const paddingNeeded = targetDuration - actualDuration;
      console.log(
        `  📏 Audio shorter than target, will need ${paddingNeeded.toFixed(
          1
        )}s padding`
      );
    }
  } else {
    optimizationApplied = "perfect-fit";
    console.log(
      `  ✅ Audio duration perfect fit (${actualDuration.toFixed(1)}s)`
    );
  }

  return {
    ...audioResult,
    optimizationApplied,
    targetDuration,
    actualDuration,
    paddingNeeded: Math.max(0, targetDuration - actualDuration),
    trimmingNeeded: Math.max(0, actualDuration - targetDuration),
    fitQuality: calculateFitQuality(actualDuration, targetDuration),
  };
}

/**
 * Calculate how well the audio duration fits the target
 * @param {number} actual - Actual duration
 * @param {number} target - Target duration
 * @returns {string} Fit quality rating
 */
function calculateFitQuality(actual, target) {
  const ratio = actual / target;

  if (ratio >= 0.95 && ratio <= 1.05) return "excellent";
  if (ratio >= 0.85 && ratio <= 1.15) return "good";
  if (ratio >= 0.7 && ratio <= 1.3) return "fair";
  return "poor";
}

/**
 * Get audio file duration using ffprobe
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
async function getAudioDuration(audioPath) {
  try {
    const { stderr } = await execFilePromise("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ]);

    const duration = parseFloat(stderr);
    if (isNaN(duration)) {
      throw new Error("Invalid duration value");
    }
    return duration;
  } catch (error) {
    console.error("FFprobe error:", error);
    // Fallback to estimation
    return estimateAudioDurationFromFile(audioPath);
  }
}

/**
 * Estimate audio duration based on file size (fallback)
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} - Estimated duration in seconds
 */
async function estimateAudioDurationFromFile(audioPath) {
  try {
    const stats = await fs.stat(audioPath);
    // Rough estimate: MP3 files are ~1-2KB per second at reasonable quality
    return Math.max(1, stats.size / 1500);
  } catch (error) {
    return 5; // Default fallback duration
  }
}

/**
 * Estimate audio duration based on text length
 * @param {string} text - Text content
 * @returns {number} - Estimated duration in seconds
 */
function estimateAudioDurationFromText(text) {
  // More accurate estimation based on actual reading speed
  const wordsPerMinute = config.wordsPerMinute;
  const charactersPerWord = 5;
  const estimatedWords = text.length / charactersPerWord;
  const estimatedMinutes = estimatedWords / wordsPerMinute;
  return Math.max(1, estimatedMinutes * 60);
}

/**
 * Clean text for better TTS output (enhanced version)
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function cleanTextForTTS(text) {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, " ")
      // Remove special characters that might cause TTS issues
      .replace(/[^\w\s.,!?;:()\-"']/g, "")
      // Fix common abbreviations for better pronunciation
      .replace(/\bdr\./gi, "doctor")
      .replace(/\bmr\./gi, "mister")
      .replace(/\bmrs\./gi, "missus")
      .replace(/\bms\./gi, "miss")
      .replace(/\betc\./gi, "etcetera")
      .replace(/\bvs\./gi, "versus")
      .replace(/\be\.g\./gi, "for example")
      .replace(/\bi\.e\./gi, "that is")
      .replace(/\bco\./gi, "company")
      .replace(/\binc\./gi, "incorporated")
      // Handle numbers and percentages
      .replace(/(\d+)%/g, "$1 percent")
      .replace(/(\d+)°/g, "$1 degrees")
      // Improve sentence flow
      .replace(/([.!?])\s*([A-Z])/g, "$1 $2")
      // Ensure proper sentence ending
      .trim()
      .replace(/([^.!?])$/, "$1.")
  );
}

/**
 * Utility function for delays
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Validate scenes array before processing
 * @param {Array} scenes - Scenes to validate
 * @returns {Object} - Validation result
 */
function validateScenesForTTS(scenes) {
  if (!Array.isArray(scenes)) {
    return { valid: false, error: "Scenes must be an array" };
  }

  if (scenes.length === 0) {
    return { valid: false, error: "Scenes array cannot be empty" };
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    if (!scene || typeof scene !== "object") {
      return { valid: false, error: `Scene ${i + 1} must be an object` };
    }

    if (!scene.text || typeof scene.text !== "string") {
      return {
        valid: false,
        error: `Scene ${i + 1} must have a text property`,
      };
    }

    if (scene.text.trim().length === 0) {
      return { valid: false, error: `Scene ${i + 1} text cannot be empty` };
    }

    if (!scene.id) {
      return { valid: false, error: `Scene ${i + 1} must have an id property` };
    }
  }

  return { valid: true };
}

/**
 * Get comprehensive TTS processing statistics
 * @param {Array<Object>} audioResults - Audio processing results
 * @param {Object} config - Processing configuration
 * @returns {Object} - Statistics object
 */
function getProcessingStats(audioResults, config = {}) {
  const successful = audioResults.filter((r) => r.audio && r.audio.success);
  const failed = audioResults.filter((r) => r.audio && r.audio.error);
  const totalDuration = successful.reduce(
    (sum, r) => sum + r.audio.duration,
    0
  );
  const totalFileSize = successful.reduce(
    (sum, r) => sum + r.audio.fileSize,
    0
  );

  const fitQualityDistribution = successful.reduce((acc, r) => {
    const quality = r.audio.fitQuality || "unknown";
    acc[quality] = (acc[quality] || 0) + 1;
    return acc;
  }, {});

  return {
    totalScenes: audioResults.length,
    successful: successful.length,
    failed: failed.length,
    successRate: Math.round((successful.length / audioResults.length) * 100),
    totalDuration: Math.round(totalDuration * 100) / 100,
    averageDuration:
      successful.length > 0
        ? Math.round((totalDuration / successful.length) * 100) / 100
        : 0,
    totalFileSize: totalFileSize,
    averageFileSize:
      successful.length > 0 ? Math.round(totalFileSize / successful.length) : 0,
    language: config.language || "en",
    audioFormat: config.audioFormat || "mp3",
    fitQualityDistribution,
    processingTime: new Date().toISOString(),
    sessionId: sessionState.sessionId,
  };
}

/**
 * Clean up generated audio files
 * @param {Array<Object>} scenes - Scenes with audio data
 * @returns {Promise<void>}
 */
async function cleanup(scenes = []) {
  console.log("🧹 Cleaning up temporary audio files...");

  let cleanedCount = 0;
  let errorCount = 0;

  for (const scene of scenes) {
    if (scene.audio && scene.audio.filePath) {
      try {
        await fs.unlink(scene.audio.filePath);
        console.log(`  ✅ Deleted: ${scene.audio.fileName}`);
        cleanedCount++;
      } catch (error) {
        console.warn(
          `  ⚠️  Could not delete ${scene.audio.fileName}:`,
          error.message
        );
        errorCount++;
      }
    }
  }

  // Try to remove the session directory if empty
  try {
    if (sessionState.tempDir) {
      await fs.rmdir(sessionState.tempDir);
      console.log(`🧹 Removed session directory: ${sessionState.tempDir}`);
    }
  } catch (error) {
    // Directory not empty or other error - that's okay
  }

  console.log(
    `🧹 Cleanup complete: ${cleanedCount} files deleted, ${errorCount} errors`
  );
}

/**
 * Reset session state
 */
function resetSession() {
  sessionState = {
    processedAudio: new Set(),
    sessionId: null,
    tempDir: null,
    totalAudioDuration: 0,
  };
}

/**
 * Get current session state (for debugging)
 */
function getSessionState() {
  return { ...sessionState };
}

// Export all functions
module.exports = {
  processSceneAudio,
  generateAudioForScene,
  generateWithGTTS,
  optimizeAudioTiming,
  calculateFitQuality,
  getAudioDuration,
  estimateAudioDurationFromFile,
  estimateAudioDurationFromText,
  cleanTextForTTS,
  validateScenesForTTS,
  getProcessingStats,
  cleanup,
  resetSession,
  initializeSession,
  getSessionState,
  delay,
  formatFileSize,
};
