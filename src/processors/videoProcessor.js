// src/processors/videoProcessor.js
const { execFile } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");
const { get } = require("http");
const execAsync = promisify(exec);

// Configuration and state
const config = {
  defaultResolution: "720p",
  defaultFramerate: 30,
  defaultVideoCodec: "libx264",
  defaultAudioCodec: "aac",
  videoQualities: {
    "480p": { width: 854, height: 480, bitrate: "1000k" },
    "720p": { width: 1280, height: 720, bitrate: "2500k" },
    "1080p": { width: 1920, height: 1080, bitrate: "4000k" },
  },
  tempFilePrefix: "temp_scene_",
  maxConcurrentProcesses: 2,
};

let sessionState = {
  processedScenes: new Set(),
  sessionId: null,
  tempDir: null,
  outputDir: null,
  totalProcessingTime: 0,
};

/**
 * Initialize session directories
 */
async function initializeSession() {
  if (!sessionState.sessionId) {
    const now = new Date();
    sessionState.sessionId = now
      .toISOString()
      .replace(/[:.]/g, "")
      .slice(0, 15);
    sessionState.tempDir = path.join(
      "W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp"
    );
    sessionState.outputDir = path.join(
      "W:/College/Internship/Alvin_major_Project/script-to-video-generator/output"
    );

    try {
      await fs.mkdir(sessionState.tempDir, { recursive: true });
      await fs.mkdir(sessionState.outputDir, { recursive: true });
      console.log(
        `🎥 Video processing session initialized: ${sessionState.sessionId}`
      );
    } catch (error) {
      console.error("❌ Failed to create video directories:", error);
      throw error;
    }
  }
  return sessionState;
}

/**
 * Main function to compile scenes into final video
 * @param {Array} scenes - Processed scenes with audio and visual data
 * @param {Object} options - Video processing options
 * @returns {Object} Final video compilation result
 */
async function compileVideo(scenes, options = {}) {
  console.log("🎬 Starting video compilation...");

  const startTime = Date.now();

  if (!sessionState.sessionId) {
    await initializeSession();
  }

  const processingConfig = {
    resolution: options.videoQuality || config.defaultResolution,
    framerate: options.framerate || config.defaultFramerate,
    videoCodec: options.videoCodec || config.defaultVideoCodec,
    audioCodec: options.audioCodec || config.defaultAudioCodec,
    includeSubtitles: options.includeSubtitles || true,
    transitionEffect: options.transitionEffect || "fade",
    backgroundMusic: options.backgroundMusic || null,
    outputFormat: options.outputFormat || "mp4",
    tempFilePrefix: config.tempFilePrefix,
    videoQualities: config.videoQualities,
    ...options,
  };

  try {
    // Validate scenes data
    const validation = validateScenesForVideo(scenes);
    if (!validation.valid) {
      throw new Error(`Scene validation failed: ${validation.error}`);
    }

    console.log(
      `📊 Processing ${scenes.length} scenes at ${processingConfig.resolution}`
    );

    // Step 1: Prepare individual scene videos
    const preparedScenes = await prepareIndividualScenes(
      scenes,
      processingConfig
    );
    console.log(
      `✅ Prepared ${
        preparedScenes.filter((s) => s.success).length
      } scene videos`
    );

    // Step 2: Generate subtitles if requested
    let subtitleFile = null;
    if (processingConfig.includeSubtitles) {
      subtitleFile = await generateMasterSubtitles(scenes, processingConfig);
      console.log(`✅ Generated master subtitle file`);
    }

    // Step 3: Concatenate all scenes
    const finalVideoPath = await concatenateScenes(
      preparedScenes,
      processingConfig,
      subtitleFile
    );
    console.log(`✅ Video compilation complete!`);

    // Calculate processing time
    const endTime = Date.now();
    sessionState.totalProcessingTime = (endTime - startTime) / 1000;

    // Get final video metadata
    const videoMetadata = await getVideoMetadata(finalVideoPath);
    const fileStats = await fs.stat(finalVideoPath);

    const result = {
      success: true,
      videoPath: finalVideoPath,
      fileName: path.basename(finalVideoPath),
      metadata: {
        ...videoMetadata,
        fileSize: fileStats.size,
        totalScenes: scenes.length,
        resolution: processingConfig.resolution,
        framerate: processingConfig.framerate,
        audioCodec: processingConfig.audioCodec,
        videoCodec: processingConfig.videoCodec,
        includesSubtitles: !!subtitleFile,
      },
      processing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        processingTime: `${sessionState.totalProcessingTime.toFixed(
          3
        )} seconds`,
        sessionId: sessionState.sessionId,
      },
      scenes: preparedScenes.map((scene, index) => ({
        id: scenes[index].id,
        startTime: formatTimestamp(index * (scenes[index].duration)),
        endTime: formatTimestamp((index + 1) * (scenes[index].duration)),
        text: scenes[index].text.substring(0, 50) + "...",
        visualUsed: scene.visual ? scene.visual.fileName : "none",
        audioFile: scene.audio ? scene.audio.fileName : "none",
        success: scene.success,
      })),
      tempFiles: {
        cleaned: false,
        sessionDirectory: "W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp",
        subtitleFile: subtitleFile,
      },
    };

    return result;
  } catch (error) {
    console.error("❌ Video compilation failed:", error);
    return {
      success: false,
      error: error.message,
      processingTime: sessionState.totalProcessingTime,
      sessionId: sessionState.sessionId,
      scenes: scenes.map((s) => ({
        ...s,
        success: false,
        error: error.message,
      })),
    };
  }
}

/**
 * Prepare individual scene videos by combining audio and visual
 * @param {Array} scenes - Scenes with audio and visual data
 * @param {Object} config - Processing configuration
 * @returns {Array} Prepared scene results
 */
async function prepareIndividualScenes(scenes, config) {
  const preparedScenes = [];
  const quality =
    config.videoQualities[config.resolution] || config.videoQualities["720p"];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n🎞️  Processing Scene ${scene.id}/${scenes.length}...`);

    try {
      const sceneResult = await processIndividualScene(
        scene,
        config,
        quality,
        i
      );
      preparedScenes.push(sceneResult);

      sessionState.processedScenes.add(scene.id);
    } catch (error) {
      console.error(`  ❌ Failed to process scene ${scene.id}:`, error.stack);
      preparedScenes.push({
        success: false,
        error: error.message,
        sceneId: scene.id,
        outputPath: null,
      });
    }

    // Brief pause between scenes to prevent system overload
    if (i < scenes.length - 1) {
      await delay(500);
    }
  }

  return preparedScenes;
}

/**
 * Process a single scene by combining its audio and visual
 * @param {Object} scene - Scene with audio and visual data
 * @param {Object} config - Processing configuration
 * @param {Object} quality - Quality settings
 * @param {number} index - Scene index for file naming
 * @returns {Object} Scene processing result
 */
async function processIndividualScene(scene, config, quality, index) {
  const sceneOutputPath = path.join(
    'W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp',
    `${config.tempFilePrefix}${scene.id}.mp4`
  );
  const sceneDuration = scene.actualDuration;

  // Validate required assets
  if (!scene.audio || !scene.audio.filePath) {
    throw new Error(`Scene ${scene.id}: No audio file available`);
  }

  if (
    !scene.visual ||
    !scene.visual.selected ||
    !scene.visual.selected.localPath
  ) {
    throw new Error(`Scene ${scene.id}: No visual file available`);
  }
  // Check if files exist
  await fs.access(scene.audio.filePath);
  await fs.access(scene.visual.selected.localPath);
  // Build FFmpeg command for scene
  const ffmpegArgs = [
    "-y", // Overwrite output files
    "-loop",
    "1", // Loop the image
    "-i",scene.visual.selected.localPath, // Input image
    "-i",scene.audio.filePath, // Input audio
    "-map","0:v:0", // Use first input's video
    "-map","1:a:0", // Use second input's audio
    "-c:v",config.videoCodec,
    "-c:a",config.audioCodec,
    "-r",config.framerate.toString(),
    "-vf",`scale=${quality.width}:${quality.height}:force_original_aspect_ratio=decrease,pad=${quality.width}:${quality.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
    "-b:v",quality.bitrate,
    "-t",sceneDuration.toString(), // Limit duration
    "-pix_fmt",
    "yuv420p", // Compatibility
    sceneOutputPath,
  ];

  console.log(`  ⚙️  Executing FFmpeg for scene ${scene.id}...`);

  await executeFFmpeg(ffmpegArgs);

  // Verify output
  const outputStats = await fs.stat(sceneOutputPath);
  if (outputStats.size === 0) {
    throw new Error(`Generated scene video is empty`);
  }

  console.log(
    `  ✅ Scene ${scene.id} complete: ${formatFileSize(outputStats.size)}`
  );

  return {
    success: true,
    sceneId: scene.id,
    outputPath: sceneOutputPath,
    fileName: path.basename(sceneOutputPath),
    fileSize: outputStats.size,
    duration: sceneDuration,
    resolution: `${quality.width}x${quality.height}`,
    visual: scene.visual.selected,
    audio: scene.audio,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Concatenate all scene videos into final output
 * @param {Array} preparedScenes - Individual scene results
 * @param {Object} config - Processing configuration
 * @param {string|null} subtitleFile - Optional subtitle file
 * @returns {string} Path to final video
 */
async function concatenateScenes(preparedScenes, config, subtitleFile = null) {
  console.log("\n🔗 Concatenating scenes into final video...");

  const successfulScenes = preparedScenes.filter((s) => s.success);
  if (successfulScenes.length === 0) {
    throw new Error("No successfully processed scenes to concatenate");
  }

  // Create concat list file for FFmpeg
  const concatListPath = path.join("W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp", "concat_list.txt");
  const concatContent = successfulScenes
    .map((scene) => `file '${scene.outputPath.replace(/\\/g, "/")}'`)
    .join("\n");

  await fs.writeFile(concatListPath, concatContent);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const outputFileName = `compiled_video_${timestamp}.${config.outputFormat}`;
  const finalOutputPath = path.join(sessionState.outputDir, outputFileName);

  // // Build FFmpeg command with fixed subtitle handling
  const ffmpegArgs = [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatListPath
  ];

  ffmpegArgs.push(finalOutputPath);

  console.log(`  🎬 Creating final video: ${outputFileName}...`);
  await executeFFmpeg(ffmpegArgs);

  // Verify final output
  const finalStats = await fs.stat(finalOutputPath);
  if (finalStats.size === 0) {
    throw new Error("Final video file is empty");
  }

  console.log(`  ✅ Final video created: ${formatFileSize(finalStats.size)}`);
  return finalOutputPath;
}



/**
 * Generate master subtitle file for all scenes
 * @param {Array} scenes - Scenes with text content
 * @param {Object} config - Processing configuration
 * @returns {string} Path to subtitle file
 */
async function generateMasterSubtitles(scenes, config) {
  console.log("\n📝 Generating master subtitles...");

  const subtitlePath = path.join('W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp', "master_subtitles.vtt");
  let vttContent = "WEBVTT\n\n";

  let currentTime = 0;

  for (const scene of scenes) {
    const sceneDuration = scene.duration
    const startTime = formatSubtitleTime(currentTime);
    const endTime = formatSubtitleTime(currentTime + sceneDuration);

    // Split long text into multiple subtitle segments
    const words = scene.text.split(" ");
    const maxWordsPerSubtitle = 8;
    const segmentDuration =
      sceneDuration / Math.ceil(words.length / maxWordsPerSubtitle);

    let segmentStartTime = currentTime;

    for (let i = 0; i < words.length; i += maxWordsPerSubtitle) {
      const segmentWords = words.slice(i, i + maxWordsPerSubtitle);
      const segmentEndTime = Math.min(
        segmentStartTime + segmentDuration,
        currentTime + sceneDuration
      );

      vttContent += `${formatSubtitleTime(
        segmentStartTime
      )} --> ${formatSubtitleTime(segmentEndTime)}\n`;
      vttContent += `${segmentWords.join(" ")}\n\n`;

      segmentStartTime = segmentEndTime;
    }

    currentTime += sceneDuration;
  }

  await fs.writeFile(subtitlePath, vttContent);
  console.log(`  ✅ Subtitle file generated: ${path.basename(subtitlePath)}`);
  console.log(subtitlePath);
  return subtitlePath;
}

/**
 * Execute FFmpeg command with proper error handling
 * @param {Array} args - FFmpeg arguments
 * @returns {Promise<void>}
 */
function executeFFmpeg(args) {
  return new Promise((resolve, reject) => {
    console.log(`    🔧 ffmpeg ${args.join(" ")}`);

    const ffmpegProcess = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let errorOutput = "";

    ffmpegProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      // Show progress for long operations
      if (data.toString().includes("time=")) {
        const timeMatch = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          process.stdout.write(`\r    ⏱️  Processing... ${timeMatch[1]}`);
        }
      }
    });

    ffmpegProcess.on("close", (code) => {
      process.stdout.write("\n"); // Clear progress line
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}:\n${errorOutput}`));
      }
    });

    ffmpegProcess.on("error", (error) => {
      reject(new Error(`FFmpeg execution failed: ${error.message}`));
    });
  });
}

/**
 * Get video metadata using ffprobe
 * @param {string} videoPath - Path to video file
 * @returns {Object} Video metadata
 */
async function getVideoMetadata(videoPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
    );
    const metadata = JSON.parse(stdout);

    const videoStream = metadata.streams.find((s) => s.codec_type === "video");
    const audioStream = metadata.streams.find((s) => s.codec_type === "audio");

    return {
      duration: parseFloat(metadata.format.duration),
      bitrate: parseInt(metadata.format.bit_rate),
      width: videoStream ? videoStream.width : 0,
      height: videoStream ? videoStream.height : 0,
      framerate: videoStream ? eval(videoStream.r_frame_rate) : 0,
      videoCodec: videoStream ? videoStream.codec_name : "unknown",
      audioCodec: audioStream ? audioStream.codec_name : "unknown",
    };
  } catch (error) {
    console.warn("⚠️  Could not read video metadata:", error.message);
    return {
      duration: 0,
      bitrate: 0,
      width: 0,
      height: 0,
      framerate: 0,
      videoCodec: "unknown",
      audioCodec: "unknown",
    };
  }
}

/**
 * Validate scenes for video processing
 * @param {Array} scenes - Scenes to validate
 * @returns {Object} Validation result
 */
function validateScenesForVideo(scenes) {
  if (!Array.isArray(scenes)) {
    return { valid: false, error: "Scenes must be an array" };
  }

  if (scenes.length === 0) {
    return { valid: false, error: "Scenes array cannot be empty" };
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    if (!scene.id) {
      return { valid: false, error: `Scene ${i + 1} must have an id` };
    }

    if (!scene.text) {
      return { valid: false, error: `Scene ${scene.id} must have text` };
    }

    if (!scene.audio || !scene.audio.filePath) {
      return {
        valid: false,
        error: `Scene ${scene.id} must have audio data with filePath`,
      };
    }

    if (
      !scene.visual ||
      !scene.visual.selected ||
      !scene.visual.selected.localPath
    ) {
      return {
        valid: false,
        error: `Scene ${scene.id} must have visual data with selected.localPath`,
      };
    }
  }

  return { valid: true };
}

/**
 * Utility functions
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatSubtitleTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
}

/**
 * Clean up temporary video files
 * @param {Array} sceneResults - Scene processing results
 * @returns {Promise<void>}
 */
async function cleanup(sceneResults = []) {
  console.log("🧹 Cleaning up temporary video files...");

  let cleanedCount = 0;

  for (const result of sceneResults) {
    if (result.outputPath) {
      try {
        await fs.unlink(result.outputPath);
        console.log(`  ✅ Deleted: ${result.fileName}`);
        cleanedCount++;
      } catch (error) {
        console.warn(
          `  ⚠️  Could not delete ${result.fileName}:`,
          error.message
        );
      }
    }
  }

  // Clean up other temp files
  try {
    const tempFiles = await fs.readdir("W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp");
    for (const file of tempFiles) {
      if (file.includes("concat_list") || file.includes("subtitles")) {
        await fs.unlink(path.join("W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp", file));
        cleanedCount++;
      }
    }
  } catch (error) {
    console.warn("⚠️  Could not clean all temp files:", error.message);
  }

  // Remove temp directory if empty
  try {
    await fs.rmdir(sessionState.tempDir);
    console.log(`🧹 Removed session directory`);
  } catch (error) {
    // Directory not empty - that's okay
  }

  console.log(`🧹 Video cleanup complete: ${cleanedCount} files processed`);
}

/**
 * Reset session state
 */
function resetSession() {
  sessionState = {
    processedScenes: new Set(),
    sessionId: null,
    tempDir: null,
    outputDir: null,
    totalProcessingTime: 0,
  };
}

/**
 * Get current session state
 */
function getSessionState() {
  return { ...sessionState };
}

// Export all functions
module.exports = {
  compileVideo,
  prepareIndividualScenes,
  processIndividualScene,
  concatenateScenes,
  generateMasterSubtitles,
  executeFFmpeg,
  getVideoMetadata,
  validateScenesForVideo,
  cleanup,
  resetSession,
  initializeSession,
  getSessionState,
  delay,
  formatFileSize,
  formatTimestamp,
  formatSubtitleTime,
};
