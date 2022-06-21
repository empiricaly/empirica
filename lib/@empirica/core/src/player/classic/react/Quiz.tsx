import React, { FormEvent, useState } from "react";

export function Quiz({ next }: { next: () => void }) {
  const labelClassName = "block text-sm font-medium text-gray-700 mb-2";
  const inputClassName =
    "appearance-none block px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 sm:text-sm";

  const [sum, setSum] = useState("");
  const [horse, setHorse] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (sum !== "4" || horse !== "white") {
      alert("Incorrect! Read the instructions and please try again.");
    } else {
      next();
    }
  }

  return (
    <div className="flex justify-center">
      <div className="mt-6 sm:mt-24">
        <h3 className="text-2xl font-semi-bold text-gray-900">Quiz</h3>
        <form className="mt-4" onSubmit={handleSubmit}>
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
              autoFocus
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
              placeholder="brown"
              value={horse}
              onChange={(e) => setHorse(e.target.value)}
              autoComplete="off"
              required
            />
          </p>

          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
