import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

async function cleanTempFolder() {
  try {
    const tempDir = "W:/College/Internship/Alvin_major_Project/script-to-video-generator/temp";

    // Check if folder exists
    if (!fs.existsSync(tempDir)) {
      console.log(`⚠️ Temp folder not found at: ${tempDir}`);
      return;
    }

    const files = await fs.promises.readdir(tempDir);

    // Delete each file
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stat = await fs.promises.lstat(filePath);

        if (stat.isDirectory()) {
          // Recursively remove subfolders
          await fs.promises.rm(filePath, { recursive: true, force: true });
        } else {
          await fs.promises.unlink(filePath);
        }
      } catch (err) {
        console.error(`❌ Error deleting ${filePath}:`, err.message);
      }
    }

    console.log(`✅ Temp folder cleaned: ${tempDir}`);
  } catch (error) {
    throw error;
  }
}

export async function GET() {
  try {
    await cleanTempFolder();
    return NextResponse.json({
      success: true,
      message: "Temp folder cleaned successfully!",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Temp folder cleaned successfully!",
    });
  }
}
