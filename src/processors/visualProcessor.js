// src/processors/visualProcessor.js

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { fileURLToPath } = require("url");

// Configuration and state
const config = {
  baseUrl: "https://api.pexels.com/v1",
  videosBaseUrl: "https://api.pexels.com/videos",
};

let sessionState = {
  downloadedImages: new Set(),
  sessionId: null,
  tempDir: null,
};

/**
 * Generate unique session ID for file organization
 */
function generateSessionId() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "").slice(0, 15);
}

/**
 * Initialize session
 */
async function initializeSession() {
  sessionState.sessionId = generateSessionId();

  // Use main temp directory without creating session-specific subfolder
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  sessionState.tempDir = path.join(
    "W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp"
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

/**
 * Main function to process visuals for all scenes
 */
async function processSceneVisuals(scenes, options = {}) {
  console.log("🔄 Starting visual search and download...");

  if (!sessionState.sessionId) {
    await initializeSession();
  }

  const processingConfig = {
    orientation: "portrait",
    preferVideos: options.preferVideos || false,
    maxSearchResults: options.maxSearchResults || 15,
    downloadQuality: options.downloadQuality || "large",
    ensureDiversity: options.ensureDiversity || true,
    apiKey: "your API key",
    ...options,
  };

  try {
    const processedScenes = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`\n🔍 Processing visuals for Scene ${scene.id}...`);

      const visualResults = await searchVisualsForScene(
        scene,
        processingConfig
      );
      const selectedVisual = selectBestVisual(
        visualResults,
        scene,
        processingConfig
      );
      const downloadedVisual = await downloadVisual(selectedVisual, scene.id);

      const sceneWithVisual = {
        ...scene,
        visual: {
          selected: downloadedVisual,
          alternatives: visualResults.slice(1, 4),
          searchQuery: buildSearchQuery(scene.primaryKeywords),
          searchResults: visualResults.length,
          selectionReason:
            selectedVisual.selectionReason || "Best relevance score",
        },
      };

      processedScenes.push(sceneWithVisual);

      if (i < scenes.length - 1) {
        await delay(1000);
      }
    }

    console.log(
      `✅ Visual processing complete! ${processedScenes.length} scenes processed`
    );

    return {
      success: true,
      totalImagesDownloaded: processedScenes.length,
      sessionId: sessionState.sessionId,
      tempDirectory:
        sessionState.tempDir,
      scenes: processedScenes,
      metadata: {
        orientation: processingConfig.orientation,
        apiCallsMade: processedScenes.length,
        failedDownloads: 0,
      },
    };
  } catch (error) {
    console.error("❌ Visual processing failed:", error);
    return {
      success: false,
      error: error.message,
      scenes: scenes,
    };
  }
}

/**
 * Search for visuals for a specific scene
 */
async function searchVisualsForScene(scene, processingConfig) {
  const searchQueries = generateSearchQueries(scene);
  let allResults = [];

  for (const query of searchQueries) {
    try {
      console.log(`  🔎 Searching: "${query}"`);

      const photoResults = await searchPexelsPhotos(query, processingConfig);
      allResults.push(...photoResults);

      if (processingConfig.preferVideos && photoResults.length < 3) {
        const videoResults = await searchPexelsVideos(query, processingConfig);
        allResults.push(...videoResults);
      }

      if (allResults.length >= processingConfig.maxSearchResults) {
        break;
      }
    } catch (error) {
      console.log(`  ⚠️ Search failed for "${query}":`, error.message);
      continue;
    }
  }

  return rankAndDeduplicateResults(allResults, scene);
}

/**
 * Generate multiple search queries from scene keywords
 */
function generateSearchQueries(scene) {
  const queries = [];

  if (scene.primaryKeywords && scene.primaryKeywords.length > 0) {
    queries.push(scene.primaryKeywords.slice(0, 3).join(" "));

    scene.primaryKeywords.forEach((keyword) => {
      if (keyword.length > 3) {
        queries.push(keyword);
      }
    });
  }

  if (scene.keywords && scene.keywords.length > 0) {
    scene.keywords.slice(0, 2).forEach((keyword) => {
      if (keyword.length > 4 && !queries.includes(keyword)) {
        queries.push(keyword);
      }
    });
  }

  if (scene.entities && scene.entities.length > 0) {
    scene.entities.slice(0, 1).forEach((entity) => {
      if (!queries.includes(entity)) {
        queries.push(entity);
      }
    });
  }

  if (queries.length === 0) {
    queries.push("business professional", "technology", "modern lifestyle");
  }

  return queries.slice(0, 5);
}

/**
 * Search Pexels Photos API
 */
async function searchPexelsPhotos(query, processingConfig) {
  if (!processingConfig.apiKey) {
    console.log("  ⚠️ No Pexels API key provided. Skipping photo search.");
    return [];
  }
  const url = `${config.baseUrl}/search`;
  const params = {
    query: query,
    per_page: processingConfig.maxSearchResults || 15,
    orientation: "portrait",
    size: processingConfig.downloadQuality || "large",
    page: 1,
  };

  const response = await axios.get(url, {
    headers: {
      Authorization: processingConfig.apiKey,
      "User-Agent": "script-to-video-generator/1.0",
    },
    params: params,
    timeout: 10000,
  });

  return response.data.photos.map((photo) => ({
    id: photo.id,
    type: "image",
    originalUrl: photo.url,
    downloadUrl: photo.src.large2x,
    mediumUrl: photo.src.large,
    thumbnailUrl: photo.src.medium,
    description: photo.alt || `Photo by ${photo.photographer}`,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    dimensions: {
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.height / photo.width,
    },
    averageColor: photo.avg_color,
    relevanceScore: 0,
    source: "pexels-photos",
  }));
}

/**
 * Search Pexels Videos API
 */
async function searchPexelsVideos(query, processingConfig) {
  if (!processingConfig.apiKey) {
    console.log("  ⚠️ No Pexels API key provided. Skipping video search.");
    return [];
  }
  const url = `${config.videosBaseUrl}/search`;
  const params = {
    query: query,
    per_page: Math.min(processingConfig.maxSearchResults || 10, 10),
    orientation: "portrait",
    size: "medium",
    page: 1,
  };

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: processingConfig.apiKey,
        "User-Agent": "script-to-video-generator/1.0",
      },
      params: params,
      timeout: 15000,
    });

    return response.data.videos.map((video) => ({
      id: video.id,
      type: "video",
      originalUrl: video.url,
      downloadUrl:
        video.video_files.find((f) => f.quality === "hd" && f.width < f.height)
          ?.link || video.video_files[0].link,
      thumbnailUrl: video.image,
      description: video.url,
      photographer: video.user.name,
      photographerUrl: video.user.url,
      dimensions: {
        width: video.width,
        height: video.height,
        aspectRatio: video.height / video.width,
      },
      duration: video.duration,
      relevanceScore: 0,
      source: "pexels-videos",
    }));
  } catch (error) {
    console.log(`  ⚠️ Video search not available: ${error.message}`);
    return [];
  }
}

/**
 * Rank and remove duplicate visual results
 */
function rankAndDeduplicateResults(results, scene) {
  const unique = results.filter(
    (result, index, arr) => arr.findIndex((r) => r.id === result.id) === index
  );

  return unique
    .map((result) => ({
      ...result,
      relevanceScore: calculateRelevanceScore(result, scene),
      qualityScore: calculateQualityScore(result),
      diversityScore: calculateDiversityScore(result),
      suitabilityScore: calculateSuitabilityScore(result),
    }))
    .map((result) => ({
      ...result,
      totalScore:
        result.relevanceScore * 0.4 +
        result.qualityScore * 0.3 +
        result.suitabilityScore * 0.2 +
        result.diversityScore * 0.1,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Calculate how relevant the visual is to the scene
 */
function calculateRelevanceScore(visual, scene) {
  let score = 5.0;

  const description = (visual.description || "").toLowerCase();
  const keywords = [...scene.primaryKeywords, ...scene.keywords.slice(0, 3)];

  keywords.forEach((keyword) => {
    if (description.includes(keyword.toLowerCase())) {
      score += 1.5;
    }
  });

  if (scene.entities) {
    scene.entities.forEach((entity) => {
      if (description.includes(entity.toLowerCase())) {
        score += 1.0;
      }
    });
  }

  return Math.min(score, 10);
}

/**
 * Calculate visual quality score
 */
function calculateQualityScore(visual) {
  let score = 5.0;
  const { width, height } = visual.dimensions;

  if (height >= 1920 && width >= 1080) {
    score += 2.0;
  } else if (height >= 1280 && width >= 720) {
    score += 1.0;
  }

  const aspectRatio = height / width;
  if (aspectRatio >= 1.6 && aspectRatio <= 1.8) {
    score += 1.5;
  } else if (aspectRatio >= 1.3 && aspectRatio <= 2.0) {
    score += 0.5;
  } else if (aspectRatio < 1.0) {
    score -= 1.0;
  }

  if (
    visual.type === "video" &&
    visual.duration >= 5 &&
    visual.duration <= 15
  ) {
    score += 1.0;
  }

  return Math.min(Math.max(score, 0), 10);
}

/**
 * Calculate diversity score
 */
function calculateDiversityScore(visual) {
  const photographerPenalty = sessionState.downloadedImages.has(
    visual.photographer
  )
    ? -2.0
    : 0;
  const colorDiversity = sessionState.downloadedImages.size > 0 ? 1.0 : 0;

  return Math.min(Math.max(5.0 + colorDiversity + photographerPenalty, 0), 10);
}

/**
 * Calculate suitability for video format
 */
function calculateSuitabilityScore(visual) {
  let score = 5.0;

  if (visual.dimensions.aspectRatio >= 1.5) {
    score += 2.0;
  } else if (visual.dimensions.aspectRatio < 1.0) {
    score -= 2.0;
  }

  const description = (visual.description || "").toLowerCase();
  if (
    description.includes("text") ||
    description.includes("sign") ||
    description.includes("logo")
  ) {
    score -= 1.0;
  }

  if (
    description.includes("clean") ||
    description.includes("minimal") ||
    description.includes("simple")
  ) {
    score += 1.0;
  }

  return Math.min(Math.max(score, 0), 10);
}

/**
 * Select the best visual from search results
 */
function selectBestVisual(results, scene, processingConfig) {
  if (results.length === 0) {
    return getFallbackVisual(scene);
  }

  const bestResult = results[0];

  return {
    ...bestResult,
    selectionReason: `Score: ${bestResult.totalScore.toFixed(
      1
    )}/10 (Relevance: ${bestResult.relevanceScore.toFixed(
      1
    )}, Quality: ${bestResult.qualityScore.toFixed(1)})`,
    selectedAt: new Date().toISOString(),
    sceneContext: {
      sceneId: scene.id,
      primaryKeywords: scene.primaryKeywords,
    },
  };
}

/**
 * Download visual file to local temp directory
 */
async function downloadVisual(visual, sceneId) {
  try {
    const fileExtension = visual.type === "video" ? "mp4" : "jpg";
    const fileName = `scene_${sceneId}_${visual.type}.${fileExtension}`;
    const localPath = path.join(sessionState.tempDir, fileName);

    console.log(`  📥 Downloading: ${fileName}...`);

    const response = await axios({
      method: "GET",
      url: visual.downloadUrl,
      responseType: "stream",
      timeout: 30000,
      headers: {
        "User-Agent": "script-to-video-generator/1.0",
      },
    });

    const writer = require("fs").createWriteStream(localPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const stats = await fs.stat(localPath);
    sessionState.downloadedImages.add(visual.photographer);

    console.log(`  ✅ Downloaded: ${fileName} (${formatFileSize(stats.size)})`);

    return {
      ...visual,
      localPath: localPath,
      fileName: fileName,
      fileSize: stats.size,
      downloadedAt: new Date().toISOString(),
      downloadSuccess: true,
    };
  } catch (error) {
    console.error(`  ❌ Download failed for scene ${sceneId}:`, error.message);

    return {
      ...visual,
      localPath: null,
      downloadSuccess: false,
      downloadError: error.message,
      fallbackUsed: true,
    };
  }
}

/**
 * Build search query from keywords
 */
function buildSearchQuery(keywords) {
  return keywords
    .filter((k) => k && k.length > 2)
    .slice(0, 3)
    .join(" ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

/**
 * Get fallback visual when search fails
 */
function getFallbackVisual(scene) {
  return {
    id: `fallback_${scene.id}`,
    type: "image",
    downloadUrl:
      "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg",
    description: "Professional fallback image",
    photographer: "Pexels",
    dimensions: { width: 1080, height: 1920 },
    isFallback: true,
    selectionReason: "Fallback used - no search results found",
  };
}

/**
 * Add delay between requests
 */
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Clean up downloaded files
 */
async function cleanup() {
  try {
    if (sessionState.tempDir) {
      await fs.rmdir(sessionState.tempDir, { recursive: true });
      console.log(`🧹 Cleaned up temp directory: ${sessionState.tempDir}`);
    }
  } catch (error) {
    console.log(`⚠️ Cleanup warning: ${error.message}`);
  }
}

/**
 * Reset session state
 */
function resetSession() {
  sessionState = {
    downloadedImages: new Set(),
    sessionId: null,
    tempDir: null,
  };
}

// Export all functions
module.exports = {
  processSceneVisuals,
  searchVisualsForScene,
  generateSearchQueries,
  searchPexelsPhotos,
  searchPexelsVideos,
  rankAndDeduplicateResults,
  calculateRelevanceScore,
  calculateQualityScore,
  calculateDiversityScore,
  calculateSuitabilityScore,
  selectBestVisual,
  downloadVisual,
  buildSearchQuery,
  getFallbackVisual,
  cleanup,
  resetSession,
  initializeSession,
  getSessionState: () => sessionState,
};
