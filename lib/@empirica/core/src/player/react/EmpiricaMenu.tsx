import React from "react";
import { createNewParticipant, isDevelopment } from "../utils";
import { Logo } from "./Logo";
import { useParticipantContext } from "./hooks";

export type EmpiricaMenuProps = {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export function EmpiricaMenu({ position = "bottom-left" }: EmpiricaMenuProps) {
  const ctx = useParticipantContext();

  if (!ctx) {
    return null;
  }

  function resetSession() {
    ctx!.session.clearSession();
    window.location.reload();
  }

  let className =
    "backdrop-blur-md bg-gray-200 rounded fixed z-20 flex space-x-1 text-gray-500";
  switch (position) {
    case "top-left":
      className += " top-0 left-0 mt-2 ml-2";
      break;
    case "top-right":
      className += " top-0 right-0 mt-2 mr-2";
      break;
    case "bottom-right":
      className += " bottom-0 right-0 mb-2 mr-2";
      break;
    case "bottom-left":
    default:
      className += " bottom-0 left-0 mb-2 ml-2";
      break;
  }

  const buttons = [
    {
      onClick: () => {
        window.open("https://empirica.ly", "_blank");
      },
      icon: <Logo />,
      title: "Empirica",
    },
    {
      onClick: () => createNewParticipant(),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full fill-current"
          viewBox="0 0 640 512"
        >
          <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
        </svg>
      ),
      inDevOnly: true,
      title: "New Participant",
    },
    {
      onClick: resetSession,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full fill-current"
          viewBox="0 0 448 512"
        >
          <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
        </svg>
      ),
      inDevOnly: true,
      title: "Reset Session",
    },
    {
      onClick: () => {
        window.open("/admin", "_blank");
      },
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full fill-current"
          viewBox="0 0 512 512"
        >
          <path d="M78.6 5C69.1-2.4 55.6-1.5 47 7L7 47c-8.5 8.5-9.4 22-2.1 31.6l80 104c4.5 5.9 11.6 9.4 19 9.4h54.1l109 109c-14.7 29-10 65.4 14.3 89.6l112 112c12.5 12.5 32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3l-112-112c-24.2-24.2-60.6-29-89.6-14.3l-109-109V104c0-7.5-3.5-14.5-9.4-19L78.6 5zM19.9 396.1C7.2 408.8 0 426.1 0 444.1C0 481.6 30.4 512 67.9 512c18 0 35.3-7.2 48-19.9L233.7 374.3c-7.8-20.9-9-43.6-3.6-65.1l-61.7-61.7L19.9 396.1zM512 144c0-10.5-1.1-20.7-3.2-30.5c-2.4-11.2-16.1-14.1-24.2-6l-63.9 63.9c-3 3-7.1 4.7-11.3 4.7H352c-8.8 0-16-7.2-16-16V102.6c0-4.2 1.7-8.3 4.7-11.3l63.9-63.9c8.1-8.1 5.2-21.8-6-24.2C388.7 1.1 378.5 0 368 0C288.5 0 224 64.5 224 144l0 .8 85.3 85.3c36-9.1 75.8 .5 104 28.7L429 274.5c49-23 83-72.8 83-130.5zM56 432a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z" />
        </svg>
      ),
      inDevOnly: true,
      title: "Admin",
    },
    {
      onClick: () => {
        window.open("https://docs.empirica.ly", "_blank");
      },
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full fill-current"
          viewBox="0 0 448 512"
        >
          <path d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
        </svg>
      ),
      inDevOnly: true,
      title: "Documentation",
    },
  ];

  return (
    <div className={className}>
      {buttons.map((button, i) => {
        let sizing = "";

        // Logo needs to be a little larger to git visual scale of other icons.
        if (i === 0) {
          sizing = "w-9 h-8 p-1.5 pl-2.5";
          if (buttons.length === 0) {
            sizing += " pr-2.5";
          }
        } else if (i === buttons.length - 1) {
          // Adding a little padding to the right of the last button for
          // aesthetics.
          sizing += "w-8.5 h-8 p-2 pr-2.5";
        }

        return <ToolButton key={i} {...button} sizing={sizing} />;
      })}
    </div>
  );
}

export type ToolButtonProps = {
  onClick: () => void;
  icon: React.ReactNode;
  inDevOnly?: boolean;
  sizing?: string;
  title?: string;
};

function ToolButton({
  onClick,
  icon,
  title,
  sizing = "",
  inDevOnly = false,
}: ToolButtonProps) {
  if (inDevOnly && !isDevelopment) {
    return <></>;
  }

  let size = "w-8 h-8 p-2";

  if (sizing) {
    size = sizing;
  }

  let className =
    "block bg-transparent hover:text-empirica-600 hover:bg-gray-300 rounded " +
    size;

  return (
    <button onClick={onClick} className={className} title={title}>
      {icon}
    </button>
  );
}
