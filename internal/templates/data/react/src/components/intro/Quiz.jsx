import React, { useState } from "react";
import { Button } from "../Button";

export function Quiz({ next }) {
  const labelClassName = "block text-sm font-medium text-gray-700 mb-2";
  const inputClassName =
    "appearance-none block px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 sm:text-sm";

  const [sum, setSum] = useState("");
  const [horse, setHorse] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (sum !== "4" || horse !== "white") {
      alert("Incorrect! Read the instructions, and please try again.");
    } else {
      next();
    }
  }

  return (
    <div className="mt-3 sm:mt-5">
      <h3 className="text-lg leading-6 font-medium text-gray-900">Quiz</h3>
      <form onSubmit={handleSubmit}>
        <p className="mb-5">
          <label className={labelClassName}>What is 2+2?</label>
          <input
            className={inputClassName}
            type="text"
            dir="auto"
            id="sum"
            name="sum"
            placeholder="e.g. 3"
            value={sum}
            onChange={(e) => setSum(e.target.value)}
            autoComplete="off"
            required
          />
        </p>
        <p className="mb-5">
          <label className={labelClassName}>
            What color was Napoleon's white horse?
          </label>
          <input
            className={inputClassName}
            type="text"
            dir="auto"
            id="horse"
            name="horse"
            placeholder="e.g. brown"
            value={horse}
            onChange={(e) => setHorse(e.target.value)}
            autoComplete="off"
            required
          />
        </p>

        <button
          className="justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          type="submit"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
