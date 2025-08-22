import { NextResponse } from "next/server";
import { compileVideo } from "@/src/processors/videoProcessor";
import path from "path";
import * as mm from "music-metadata";

export async function POST(req) {
  try {
    const body = await req.json();
    let script = body.script;

    const getAudioDuration = async (filePath) => {
      const metadata = await mm.parseFile(filePath);
      return metadata.format.duration; // duration in seconds
    };

    const getMetaDataForScript = async (script) => {
      const tempDir = path.join(
        "W:/College/Internship/Alvin_major_Project/script-to-video-generator",
        "temp"
      );

      for (let [index, scene] of script.entries()) {
        scene.audio = {};
        scene.visual = {};
        scene.visual.selected = {};
        scene.actualDuration = Math.ceil(
          await getAudioDuration(
            path.join(
              "W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp",
              `scene_${index + 1}_audio.mp3`
            )
          )
        );

        scene.audio.filePath = path.join(
          tempDir,
          `scene_${index + 1}_audio.mp3`
        );
        scene.visual.selected.localPath = path.join(
          tempDir,
          `scene_${index + 1}_image.jpg`
        );
      }

      return script;
    };
    script = await getMetaDataForScript(script);
    console.log(typeof script);
    const processed_video = await compileVideo(script);
    return NextResponse.json({ success: true, data: processed_video });
  } catch (error) {
    console.error("Error processing script:", error);
    return NextResponse.json({ success: false });
  }
}
