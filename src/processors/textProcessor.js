// src/processors/textProcessor.js
"use server";
const { HfInference } = require("@huggingface/inference");
const rake = require("node-rake");
const natural = require("natural");
const nlp = require("compromise");

const hf = new HfInference("your API key");
const tokenizer = new natural.SentenceTokenizer();

/**
 * Main function to process input script
 * @param {string} script - Raw input script
 * @param {Object} options - Processing options
 * @returns {Object} Processed scenes with keywords
 */
async function processScript(script, options = {}) {
  console.log("🔄 Starting text preprocessing...");

  try {
    const cleanedText = cleanText(script);
    console.log("✅ Text cleaned and normalized");

    let scenes = await segmentIntoScenes(cleanedText, options);
    console.log(`✅ Segmented into ${scenes.length} scenes`);

    const scenesWithKeywords = await extractKeywordsForScenes(scenes);
    console.log("✅ Keywords extracted for all scenes");

    const optimizedScenes = optimizeScenes(scenesWithKeywords, options);
    console.log("✅ Scenes optimized");

    return {
      success: true,
      totalScenes: optimizedScenes.length,
      estimatedDuration: optimizedScenes.length * (options.sceneDuration || 6),
      scenes: optimizedScenes,
      metadata: {
        originalLength: script.length,
        cleanedLength: cleanedText.length,
        averageSceneLength: Math.round(
          cleanedText.length / optimizedScenes.length
        ),
      },
    };
  } catch (error) {
    console.error("❌ Text processing failed:", error);
    return {
      success: false,
      error: error.message,
      scenes: [],
    };
  }
}

function cleanText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/[^\w\s.,!?;:()\-"']/g, "")
    .trim();
}

async function segmentIntoScenes(text, options = {}) {
  const minSceneLength = options.minSceneLength || 20;
  const maxSceneLength = options.maxSceneLength || 30;
  const targetScenes = options.targetScenes || null;

  let scenes = await semanticSegmentation(text, targetScenes);
  // scenes = segmentByParagraphs(text, minSceneLength, maxSceneLength);

  if (scenes.some((scene) => scene.text.length > maxSceneLength)) {
    scenes = segmentBySentences(text, minSceneLength, maxSceneLength);
  }

  if (targetScenes && Math.abs(scenes.length - targetScenes) > 1) {
  }

  return scenes.map((scene, index) => ({
    id: index + 1,
    text: scene.text.trim(),
    wordCount: scene.text.split(" ").length,
    estimatedReadingTime: Math.ceil(scene.text.split(" ").length / 3),
    duration: options.sceneDuration || 6,
  }));
}

function segmentByParagraphs(text, minLength, maxLength) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const scenes = [];
  let currentScene = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (currentScene && currentScene.length + trimmed.length > maxLength) {
      if (currentScene.length >= minLength) {
        scenes.push({ text: currentScene.trim() });
        currentScene = trimmed;
      } else {
        const splitScenes = splitLongParagraph(
          currentScene + " " + trimmed,
          minLength,
          maxLength
        );
        scenes.push(...splitScenes);
        currentScene = "";
      }
    } else {
      currentScene += (currentScene ? " " : "") + trimmed;
    }
  }

  if (currentScene.trim() && currentScene.length >= minLength) {
    scenes.push({ text: currentScene.trim() });
  }

  return scenes;
}

function segmentBySentences(text, minLength, maxLength) {
  const sentences = tokenizer.tokenize(text);
  const scenes = [];
  let currentScene = "";

  for (const sentence of sentences) {
    if (currentScene && currentScene.length + sentence.length > maxLength) {
      if (currentScene.length >= minLength) {
        scenes.push({ text: currentScene.trim() });
        currentScene = sentence;
      } else {
        currentScene += " " + sentence;
      }
    } else {
      currentScene += (currentScene ? " " : "") + sentence;
    }
  }

  if (currentScene.trim() && currentScene.length >= minLength) {
    scenes.push({ text: currentScene.trim() });
  }

  return scenes;
}

function splitLongParagraph(paragraph, minLength, maxLength) {
  const sentences = tokenizer.tokenize(paragraph);
  const scenes = [];
  let currentScene = "";

  for (const sentence of sentences) {
    if (
      currentScene.length + sentence.length > maxLength &&
      currentScene.length >= minLength
    ) {
      scenes.push({ text: currentScene.trim() });
      currentScene = sentence;
    } else {
      currentScene += (currentScene ? " " : "") + sentence;
    }
  }

  if (currentScene.trim()) {
    scenes.push({ text: currentScene.trim() });
  }

  return scenes;
}

async function semanticSegmentation(text, targetScenes) {
  try {
    console.log(
      `🧠 Attempting semantic segmentation for ${targetScenes} scenes...`
    );

    const prompt = `Think as a professional instagram reel maker .Split this text into exactly ${targetScenes} logical sections.Make sure the scenes are not to long so that the viewer can follow the reel intuitively . avoid using long sentences Return only the split text separated by "|||":\n\n${text}`;

    const response = await hf.textGeneration({
      model: "microsoft/DialoGPT-medium",
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.3,
        return_full_text: false,
      },
    });

    const segments = response.generated_text
      .split("|||")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (segments.length === targetScenes) {
      return segments.map((text) => ({ text }));
    } else {
      console.log(
        "⚠️ Semantic segmentation failed, falling back to sentence-based"
      );
      return segmentBySentences(text, 80, 250);
    }
  } catch (error) {
    console.log("⚠️ Semantic segmentation error, using fallback method");
    return segmentBySentences(text, 80, 250);
  }
}

async function extractKeywordsForScenes(scenes) {
  return Promise.all(
    scenes.map(async (scene) => {
      const stopWords = [
        "a","able","about","above","according","accordingly","across","actually",
        "after","afterwards","again","against","ain't","all","allow","allows",
        "almost","alone","along","already","also","although","always","am","among",
        "amongst","an","and","another","any","anybody","anyhow","anyone","anything",
        "anyway","anyways","anywhere","apart","appear","appreciate","appropriate",
        "are","aren't","around","as","aside","ask","asking","associated","at",
        "available","away","awfully","b","be","became","because","become","becomes",
        "becoming","been","before","beforehand","behind","being","believe","below",
        "beside","besides","best","better","between","beyond","both","brief","but",
        "by","c","c'mon","c's","came","can","can't","cannot","cant","cause","causes",
        "certain","certainly","changes","clearly","co","com","come","comes",
        "concerning","consequently","consider","considering","contain","containing",
        "contains","corresponding","could","couldn't","course","currently","d",
        "definitely","described","despite","did","didn't","different","do","does",
        "doesn't","doing","don't","done","down","downwards","during","e","each","edu",
        "eg","eight","either","else","elsewhere","enough","entirely","especially",
        "et","etc","even","ever","every","everybody","everyone","everything",
        "everywhere","ex","exactly","example","except","f","far","few","fifth",
        "first","five","followed","following","follows","for","former","formerly",
        "forth","four","from","further","furthermore","g","get","gets","getting",
        "given","gives","go","goes","going","gone","got","gotten","greetings","h",
        "had","hadn't","happens","hardly","has","hasn't","have","haven't","having",
        "he","he's","hello","help","hence","her","here","here's","hereafter","hereby",
        "herein","hereupon","hers","herself","hi","him","himself","his","hither",
        "hopefully","how","howbeit","however","i","i'd","i'll","i'm","i've","ie",
        "if","ignored","immediate","in","inasmuch","inc","indeed","indicate",
        "indicated","indicates","inner","insofar","instead","into","inward","is",
        "isn't","it","it'd","it'll","it's","its","itself","j","just","k","keep",
        "keeps","kept","know","knows","known","l","last","lately","later","latter",
        "latterly","least","less","lest","let","let's","like","liked","likely",
        "little","look","looking","looks","ltd","m","mainly","many","may","maybe",
        "me","mean","meanwhile","merely","might","more","moreover","most","mostly",
        "much","must","my","myself","n","name","namely","nd","near","nearly",
        "necessary","need","needs","neither","never","nevertheless","new","next",
        "nine","no","nobody","non","none","noone","nor","normally","not","nothing",
        "novel","now","nowhere","o","obviously","of","off","often","oh","ok","okay",
        "old","on","once","one","ones","only","onto","or","other","others",
        "otherwise","ought","our","ours","ourselves","out","outside","over","overall",
        "own","p","particular","particularly","per","perhaps","placed","please",
        "plus","possible","presumably","probably","provides","q","que","quite","qv",
        "r","rather","rd","re","really","reasonably","regarding","regardless",
        "regards","relatively","respectively","right","s","said","same","saw","say",
        "saying","says","second","secondly","see","seeing","seem","seemed","seeming",
        "seems","seen","self","selves","sensible","sent","serious","seriously",
        "seven","several","shall","she","should","shouldn't","since","six","so",
        "some","somebody","somehow","someone","something","sometime","sometimes",
        "somewhat","somewhere","soon","sorry","specified","specify","specifying",
        "still","sub","such","sup","sure","t","t's","take","taken","tell","tends",
        "th","than","thank","thanks","thanx","that","that's","thats","the","their",
        "theirs","them","themselves","then","thence","there","there's","thereafter",
        "thereby","therefore","therein","theres","thereupon","these","they","they'd",
        "they'll","they're","they've","think","third","this","thorough","thoroughly",
        "those","though","three","through","throughout","thru","thus","to","together",
        "too","took","toward","towards","tried","tries","truly","try","trying",
        "twice","two","u","un","under","unfortunately","unless","unlikely","until",
        "unto","up","upon","us","use","used","useful","uses","using","usually",
        "uucp","v","value","various","very","via","viz","vs","w","want","wants",
        "was","wasn't","way","we","we'd","we'll","we're","we've","welcome","well",
        "went","were","weren't","what","what's","whatever","when","whence",
        "whenever","where","where's","whereafter","whereas","whereby","wherein",
        "whereupon","wherever","whether","which","while","whither","who","who's",
        "whoever","whole","whom","whose","why","will","willing","wish","with",
        "within","without","won't","wonder","would","would","wouldn't","x","y","yes",
        "yet","you","you'd","you'll","you're","you've","your","yours","yourself",
        "yourselves","z","zero"];

      const rakeKeywords = rake
        .generate(scene.text, {
          stopWords: stopWords,
          ignoreCase: true,
          maxWords: 3,
          minLength: 4,
        })
        .slice(0, 8);

      const doc = nlp(scene.text);
      const entities = [
        ...doc.people().out("array"),
        ...doc.places().out("array"),
        ...doc.organizations().out("array"),
        ...doc.topics().out("array"),
      ];

      const nouns = doc.nouns().out("array");
      const adjectives = doc.adjectives().out("array");

      const allKeywords = [...rakeKeywords, ...entities, ...nouns]
        .filter((k) => k.length > 2)
        .map((k) => k.toLowerCase())
        .filter((k, i, arr) => arr.indexOf(k) === i)
        .slice(0, 6);

      const primaryKeywords = selectPrimaryKeywords(allKeywords, scene.text);

      return {
        ...scene,
        keywords: allKeywords,
        primaryKeywords,
        entities: entities.slice(0, 3),
        visualConcepts: adjectives.slice(0, 3),
      };
    })
  );
}

function selectPrimaryKeywords(keywords, text) {
  return keywords
    .map((keyword) => {
      const frequency = (
        text.toLowerCase().match(new RegExp(keyword, "g")) || []
      ).length;
      const position = text.toLowerCase().indexOf(keyword);
      const length = keyword.length;
      const score =
        frequency * 2 + (text.length - position) / text.length + length / 10;
      return { keyword, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.keyword);
}

function optimizeScenes(scenes, options = {}) {
  const targetDuration = options.sceneDuration || 6;
  const wordsPerSecond = options.wordsPerSecond || 2.5;

  return scenes.map((scene) => {
    const wordCount = scene.text.split(" ").length;
    const estimatedSpeechTime = wordCount / wordsPerSecond;

    if (estimatedSpeechTime > targetDuration * 1.2) {
      console.log(
        `⚠️ Scene ${scene.id} might be too long (${estimatedSpeechTime.toFixed(
          1
        )}s)`
      );
    } else if (estimatedSpeechTime < targetDuration * 0.6) {
      console.log(
        `⚠️ Scene ${scene.id} might be too short (${estimatedSpeechTime.toFixed(
          1
        )}s)`
      );
    }

    return {
      ...scene,
      optimizedText: scene.text,
      estimatedSpeechTime,
      paddingNeeded: Math.max(0, targetDuration - estimatedSpeechTime),
      wordCount,
    };
  });
}

export default processScript;
