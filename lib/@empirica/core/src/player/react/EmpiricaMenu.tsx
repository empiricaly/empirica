import React from "react";
import { createNewParticipant, isDevelopment } from "../utils";
import { Logo } from "./Logo";
import { useParticipantContext } from "./hooks";

export type EmpiricaMenuProps = {
  position:
    | "top"
    | "top-left"
    | "top-right"
    | "bottom"
    | "bottom-left"
    | "bottom-right";
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
    "backdrop-blur-md bg-gray-200/50 rounded fixed z-20 flex space-x-1 text-gray-500";
  switch (position) {
    case "top":
      className += " top-0 mt-2 ml-1/2 -translate-x-1/2";
      break;
    case "top-left":
      className += " top-0 left-0 mt-2 ml-2";
      break;
    case "top-right":
      className += " top-0 right-0 mt-2 mr-2";
      break;
    case "bottom":
      className += " bottom-0 mb-2 ml-1/2 -translate-x-1/2";
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
          viewBox="0 0 24 24"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="h-full w-full stroke-current"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
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
          viewBox="0 0 24 24"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="h-full w-full stroke-current"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
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
          viewBox="0 0 24 24"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="h-full w-full stroke-current"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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
          viewBox="0 0 24 24"
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="h-full w-full stroke-current"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
