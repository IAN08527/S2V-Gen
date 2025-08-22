"use client";

import React from "react";
import { Orbitron } from "next/font/google";
import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"], // choose what you need
});

const ProcessingDialog = () => {
  const [script, setScript] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(0);
  const [messages, setMessages] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("script");
    if (stored) setScript(stored);
  }, []);

  useEffect(() => {
    if (script) {
      processScript(script);
    }
  }, [script]);

  useEffect(() => {
    let messageArr = [
      "Splitting the Script into Scenes",
      "Creating Audio for the Scenes",
      "Finding Images for the Content",
      "Compiling the Video",
      "Finishing the Video",
    ];
    console.log(processingStatus);
    let passArr = [];
    for (let i = 0; i <= processingStatus; i++) {
      if (i == 5) {
        continue;
      }
      passArr.push(messageArr[i]);
    }
    setMessages(passArr);
    if (processingStatus == 4) {
      setTimeout(() => {
        router.push("/resultScreen");
      }, 5000);
    }
  }, [processingStatus]);

  async function processDetails(data, url) {
    let processed_data_res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script: data }),
    });
    let processed_data = await processed_data_res.json();
    if (processed_data.success == true) {
      setProcessingStatus((prev) => prev + 1);
      console.log(processed_data.data);
      return processed_data.data;
    } else {
      toast("Error Processing Script form the server");
    }
  }

  const processScript = async (script) => {
    if (!script) {
      toast("Error getting script .Please try again");
    } else {
      let url = "/api/process-text/";
      let processed_script = await processDetails(script, url);
      url = "/api/process-audio/";
      let processed_audio = await processDetails(processed_script.scenes, url);
      url = "api/process-visuals/";
      let processed_visuals = await processDetails(
        processed_script.scenes,
        url
      );
      url = "/api/process-video/";
      const processed_video = await processDetails(
        processed_script.scenes,
        url
      );

      //cleanup
      url = "/api/cleanup";
      let processed_data_res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      let processed_data = await processed_data_res.json();
      if (processed_data.success == true) {
        setProcessingStatus((prev) => prev + 1);
        console.log(processed_data.data);
      } else {
        toast("Error Cleaning up form the server");
      }

      //storing the data
      let data_to_give = {
        videoPath: processed_video.videoPath,
        fileName: processed_video.fileName,
        duration: processed_video.metadata.duration,
        scenes: processed_video.metadata.totalScenes,
        size: Math.floor(processed_video.metadata.fileSize / 1000000),
        resolution: `${processed_video.metadata.width}x${processed_video.metadata.height}`,
        format: "MP4",
      };
      sessionStorage.setItem("videoData", JSON.stringify(data_to_give));
    }
  };

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata", // set explicitly to avoid server/client TZ mismatches
    });
  }

  return (
    <div
      className={`input-box flex justify-center items-center h-full flex-col text-white gap-10`}
    >
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div className="message-box w-3xl max-h-65 p-4 bg-indigo-950 rounded-lg border-2 border-indigo-900/30">
        <h2 className={`font-bold text-2xl mb-5 ${orbitron.className}`}>
          Processing Status
        </h2>
        <hr className="mb-5" />
        <ul className="pl-5 space-y-4 text-sm font-mono list-none">
          {messages.map((message, index) => {
            return (
              <li className="text-gray-300" key={index}>
                {getCurrentTime() + "  "}
                <span
                  className={
                    index === messages.length - 1
                      ? "text-yellow-500"
                      : "text-green-700"
                  }
                >
                  {message}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="loading-bar w-3xl">
        <div className="loading-message flex justify-between items-center ">
          <p>Generation Progress</p>
          <p>{processingStatus *20}%</p>
        </div>
        <div className="loader h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: `${processingStatus * 20 - 100}%` }}
            transition={{
              duration: 3,
              ease: "linear",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProcessingDialog;
