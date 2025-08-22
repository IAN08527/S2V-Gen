import fs from "fs";
import path from "path";

export async function GET(req, context) {
  try {
    // ✅ params must be awaited in your version
    const { params } = context;
    const filename = params.filename;

    if (!filename) {
      return new Response("Filename not provided", { status: 400 });
    }
    
    const OUTPUT_DIR = "W:/College/Internship/Alvin_major_Project/script-to-video-generator/output";
    const filePath = path.join(OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // ✅ Handle video streaming with range requests
    const range = req.headers.get("range");
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });

      return new Response(fileStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/mp4",
        },
      });
    }

    // ✅ If no range header, return whole file
    const fileStream = fs.createReadStream(filePath);

    return new Response(fileStream, {
      headers: {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      },
    });
  } catch (err) {
    console.error("❌ Nothing Happened Here !!");
    return new Response("Internal Server Error", { status: 500 });
  }
}
