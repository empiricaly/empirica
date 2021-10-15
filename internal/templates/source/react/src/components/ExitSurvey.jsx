import React, { useState } from "react";
import { usePlayer } from "@empirica/player";
import { Radio } from "./Radio";

export function ExitSurvey({ next }) {
  const labelClassName = "block text-sm font-medium text-gray-700 mb-2";
  const inputClassName =
    "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 sm:text-sm";
  const player = usePlayer();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [strength, setStrength] = useState("");
  const [fair, setFair] = useState("");
  const [feedback, setFeedback] = useState("");
  const [education, setEducation] = useState("");

  function handleSubmit() {
    player.set("exitSurvey", {
      age,
      gender,
      strength,
      fair,
      feedback,
      education,
    });
    next();
  }

  function handleEducationChange(e) {
    setEducation(e.target.value);
  }

  return (
    <div className="mt-3 sm:mt-5 sm:p-20">
      <h1 className="text-lg leading-6 font-medium text-gray-900 mb-5">
        Exit Survey
      </h1>
      <p className="text-gray-500">
        Please submit the following code to receive your bonus:{" "}
        <strong>{player.id}</strong>.
      </p>
      <p className="text-gray-500 mb-5">
        Your final <strong>bonus</strong> is in addition of the{" "}
        <strong>1 base reward</strong> for completing the HIT.
      </p>
      <p className="text-gray-500 mb-5">
        Please answer the following short survey. You do not have to provide any
        information you feel uncomfortable with.
      </p>
      <div className="mt-2 mb-6">
        <form
          className="space-y-6"
          action="#"
          method="POST"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-row">
            <div>
              <label htmlFor="email" className={labelClassName}>
                Age
              </label>
              <div className="mt-1">
                <input
                  id="age"
                  name="age"
                  type="number"
                  autoComplete="off"
                  className={inputClassName}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>
            <div className="ml-5">
              <label htmlFor="email" className={labelClassName}>
                Gender
              </label>
              <div className="mt-1">
                <input
                  id="gender"
                  name="gender"
                  autoComplete="off"
                  className={inputClassName}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClassName}>
              Highest Education Qualification
            </label>
            <div className="grid gap-2">
              <Radio
                selected={education}
                name="education"
                value="high-school"
                label="High School"
                onChange={handleEducationChange}
              />
              <Radio
                selected={education}
                name="education"
                value="bachelor"
                label="US Bachelor's Degree"
                onChange={handleEducationChange}
              />
              <Radio
                selected={education}
                name="education"
                value="master"
                label="Master's or higher"
                onChange={handleEducationChange}
              />
              <Radio
                selected={education}
                name="education"
                value="other"
                label="Other"
                onChange={handleEducationChange}
              />
            </div>
          </div>

          <div className="flex flex-row">
            <div className="mr-5">
              <label className={labelClassName}>
                How would you describe your strength in the game?
              </label>
              <div>
                <textarea
                  className={inputClassName}
                  dir="auto"
                  id="strength"
                  name="strength"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                />
              </div>
            </div>

            <div className="mr-5">
              <label className={labelClassName}>
                Do you feel the pay was fair?
              </label>
              <div>
                <textarea
                  className={inputClassName}
                  dir="auto"
                  id="fair"
                  name="fair"
                  value={fair}
                  onChange={(e) => setFair(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClassName}>
                Feedback, including problems you encountered.
              </label>
              <div>
                <textarea
                  className={inputClassName}
                  dir="auto"
                  id="feedback"
                  name="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
