"use client";
import React from "react";
import Videopreview from "../components/Videopreview";
import Link from "next/link";
import { Orbitron } from "next/font/google";
import { useState, useEffect } from "react";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"], // choose what you need
});

const Page = () => {
  const [videoData, setVideoData] = useState({});

  useEffect(() => {
    let videoDataStorage = sessionStorage.getItem("videoData");
    if (videoDataStorage) {
      videoDataStorage = JSON.parse(videoDataStorage);
      console.log(videoDataStorage);
      setVideoData(videoDataStorage);
    }
  }, []);

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="bg-black h-[calc(100vh-9vh)] w-screen flex flex-col items-center justify-center gap-2">
      <Videopreview />
      <a href={`/api/get-video/${videoData.fileName}`} download>
        <button className="Download text-white w-50 h-12 bg-gradient-to-r from-blue-400 to-purple-600 rounded-xl">
          Download
        </button>
      </a>
      <div className="video-details inputscript bg-indigo-950 w-2xl h-30 p-4 text-white rounded-lg  flex flex-col justify-between">
        <h3 className={`${orbitron.className} text-xl`}>Video Details</h3>
        <ul className="text-sm w-full flex justify-around items-center">
          <li className="flex flex-col justify-center items-center">
            <span className="text-gray-600">Duration</span>
            <span className="text-lg">{formatTime(videoData.duration)}</span>
          </li>
          <li className="flex flex-col justify-center items-center">
            <span className="text-gray-600">Scenes</span>
            <span className="text-lg">{videoData.scenes}</span>
          </li>
          <li className="flex flex-col justify-center items-center">
            <span className="text-gray-600">File Size</span>
            <span className="text-lg">{videoData.size} MB</span>
          </li>
          <li className="flex flex-col justify-center items-center">
            <span className="text-gray-600">Resolution</span>
            <span className="text-lg">{videoData.resolution}</span>
          </li>
          <li className="flex flex-col justify-center items-center">
            <span className="text-gray-600">Format</span>
            <span className="text-lg">{videoData.format}</span>
          </li>
        </ul>
      </div>
      <Link href={"/"}>
        <button
          type="submit"
          className="w-50 h-13 text-white text-ls border-3  border-indigo-900/30 rounded-2xl cursor-pointer"
        >
          Generate Another Video
        </button>
      </Link>
    </div>
  );
};

export default Page;
