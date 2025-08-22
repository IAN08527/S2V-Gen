"use client";
import React from "react";
import { useState, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/navigation";

const InputBox = () => {
  const [textInArea, setTextInArea] = useState(false);
  const textArea = useRef(null);
  const router = useRouter();

  const handleTextArea = () => {
    setTextInArea(textArea.current.value.trim() !== "");
  };

  const handleButtonClick = () => {
    const text = textArea.current.value;
    if (text.trim().length <= 50) {
      toast("The script is too short. Please provide more details.");
    }else{
      sessionStorage.setItem("script",text)
      router.push('/generateScreen')
    }
  };

  return (
    <div className="input-box flex justify-center items-center h-full flex-col gap-20">
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
        // transition={Bounce}
      />
      <textarea
        name="scriptInput"
        id="InputScript"
        className="inputscript bg-indigo-950 w-2xl h-50 p-4 text-white rounded-lg border-2 border-indigo-900/30 focus:outline-none focus:ring-2 focus:ring-indigo-900/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        placeholder="Enter your script here... Describe your video scene by scene, and we'll generate visuals, audio, and compile everything into a professional video."
        onChange={handleTextArea}
        ref={textArea}
      ></textarea>
      <button
        type="submit"
        className="w-50 h-15 text-white text-ls border-3  border-indigo-900/30 rounded-2xl cursor-pointer disabled:cursor-not-allowed"
        disabled={!textInArea}
        onClick={handleButtonClick}
      >
        Generate video
      </button>
    </div>
  );
};

export default InputBox;
