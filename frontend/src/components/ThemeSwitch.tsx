"use client";

import { useEffect, useState } from "react";

export default function ThemeSwitch() {
  //[]: use next-theme
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");

    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <label className="inline-block h-[2rem] w-[3.5rem] relative">
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        className="opacity-0 w-0 h-0 peer"
      />
      <span
        className={`
          absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-[#f4f4f5] duration-[0.4s] rounded-[30px]

          before:absolute before:content-[''] before:h-[1.4rem] before:w-[1.4rem] before:rounded-[20px] before:left-[0.3rem] before:top-1/2 before:-translate-y-1/2
          before:bg-linear-[40deg,#ff0080,#ff8c00_70%] before:duration-[0.4s]

          peer-checked:bg-[#303136]

          peer-checked:before:left-[calc(100%-1.4rem-0.3rem)]
          peer-checked:before:bg-[#303136]
          peer-checked:before:bg-none
          peer-checked:before:shadow-moon
          `}
      />
    </label>
  );
}
