import { NextResponse } from "next/server";
import { processSceneVisuals } from "@/src/processors/visualProcessor";

export async function POST(req) {
  try {
    const body = await req.json();
    const script = body.script;

    const videoOptions = {
      preferVideos: false,
      maxSearchResults: 10,
      downloadQuality: "large",
      ensureDiversity: true,
    };
    
    const processed_audio = await processSceneVisuals(script, videoOptions);

    return NextResponse.json({ success: true, data: processed_audio });
  } catch (error) {
    console.error("Error processing script:", error);
    return NextResponse.json({ success: false });
  }
}
