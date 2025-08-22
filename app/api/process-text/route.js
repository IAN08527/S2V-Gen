"use server"

import { NextResponse } from "next/server";
import processScript from "@/src/processors/textProcessor.js";
import fs from "fs/promises";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const script = body.script;

    const options = {
      sceneDuration: 6,
      minSceneLength: 80,
      maxSceneLength: 300,
      wordsPerSecond: 2.5,
    };

    const processed_text = await processScript(script, options);

    return NextResponse.json({ success: true, data: processed_text });
  } catch (error) {
    console.error("Error processing script:", error);
    return NextResponse.json({ success: false });
  }
}
