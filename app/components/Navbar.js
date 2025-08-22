import { Orbitron } from "next/font/google";
import React from "react";
import Link from "next/link";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"], // choose what you need
});

const Navbar = () => {
  return (
    <nav className="bg-black text-white flex justify-around items-center p-4 font-black text-2xl border-b-2 border-indigo-900/30 h-[9vh]">
      <div className={orbitron.className}>S2V Gen</div>
      <ul className="menu flex gap-10 items-baseline ">
        <li>
          <Link href={"/"}>
            <button className="generate text-[13px] font-medium hover:text-indigo-900">
              Generate
            </button>
          </Link>
        </li>
        <li>
          <Link href={"/account"}>
            <button className="account w-8 h-8 flex justify-center items-center rounded-[5px] hover:bg-indigo-950">
              <img
                className="invert w-3.5 hover:text-blue-800"
                src="/profile.svg"
                alt="profile pic"
              />
            </button>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
