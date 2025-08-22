import { processSceneAudio } from "@/src/processors/ttsProcessor";
import { NextResponse } from "next/server";
import fs from "fs/promises"

export async function POST(req) {
  try {
    const body = await req.json();
    const script = body.script;
    const audioOptions = {
      language: "en",
      voiceSpeed: 1.0,
      sceneDuration: 6,
      slow: false,
    };
    
    const processed_audio = await processSceneAudio(script, audioOptions);

    return NextResponse.json({ success: true, data: processed_audio });
  } catch (error) {
    console.error("Error processing script:", error);
    return NextResponse.json({ success: false });
  }
}
