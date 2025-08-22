"use client";
import React from "react";
import { useRef, useEffect, useState } from "react";

const Videopreview = () => {
  const videoRef = useRef(null);
  const playbuttonRef = useRef(null);
  const video = videoRef.current;
  const playbutton = playbuttonRef.current;
  const [videoData, setVideoData] = useState({});

  useEffect(() => {
    let videoDataStorage = sessionStorage.getItem("videoData");
    if (videoDataStorage) {
      videoDataStorage = JSON.parse(videoDataStorage);
      console.log(videoDataStorage)
      setVideoData(videoDataStorage);
    }
  }, []);

  const playVid = () => {
    if (video.paused) {
      video.play();
      playbutton.style.display = "none";
    }
  };

  const pauseVid = () => {
    if (video.played) {
      video.pause();
      playbutton.style.display = "block";
    }
  };

  return (
    <div className="h-120 aspect-[9/16] relative">
      <video
        ref={videoRef}
        src={`/api/get-video/${videoData.fileName}`}
        className="w-full h-full object-cover"
        onClick={pauseVid}
      ></video>
      <button>
        <img
          src="./play.svg"
          alt="play video"
          className="invert w-10 absolute bottom-[50%] right-[40%]"
          ref={playbuttonRef}
          onClick={playVid}
        />
      </button>
    </div>
  );
};

export default Videopreview;
