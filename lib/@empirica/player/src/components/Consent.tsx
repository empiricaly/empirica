import React from "react";

export interface ConsentProps {
  title?: string;
  text?: string;
  buttonText?: string;
  onConsent: () => void;
}

const defaultTitle = "Do you consent to participate in this experiment?";

const defaultText = `This experiment is part of a scientific project. Your decision
to participate in this experiment is entirely voluntary. There
are no known or anticipated risks to participating in this
experiment. There is no way for us to identify you. The only
information we will have, in addition to your responses, is
the timestamps of your interactions with our site. The results
of our research may be presented at scientific meetings or
published in scientific journals. Clicking on the "I AGREE"
button indicates that you are at least 18 years of age, and
agree to participate voluntary.`;

const defaultButtonText = "I AGREE";

export const Consent: React.FC<ConsentProps> = ({
  title = defaultTitle,
  text = defaultText,
  buttonText = defaultButtonText,
  onConsent,
}) => {
  return (
    <div
      className="relative h-full z-10 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        ></div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="mt-3 sm:mt-5">
              <h3
                className="text-lg text-center leading-6 font-medium text-gray-900"
                id="modal-title"
              >
                {title}
              </h3>
              <div className="mt-2">
                <div className="text-sm text-gray-500 text-justify">{text}</div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-empirica-600 text-base font-medium text-white hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 sm:text-sm"
              onClick={onConsent}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
