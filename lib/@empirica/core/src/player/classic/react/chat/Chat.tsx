import React, { FormEvent, KeyboardEvent, MouseEvent, useState } from "react";
import { Attributable } from "../../../../shared/scopes";
import { Loading } from "../../../react";
import { WithChildren } from "../../../react/helpers";
import { usePlayer } from "../hooks";

export type ChatProps = WithChildren<{
  scope: Attributable;
  scopeKey: string;
  loading?: React.ElementType;
}>;

export function Chat({
  scope,
  scopeKey = "messages",
  loading: LoadingComp = Loading,
}: ChatProps) {
  const handleNewMessage = (msg: string) => {
    console.log("New Message:", msg);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="h-full">
        <Messages scope={scope} scopeKey={scopeKey} loading={LoadingComp} />
      </div>

      <Input onNewMessage={handleNewMessage} />
    </div>
  );
}

type MessageProps = WithChildren<{
  scope: Attributable;
  scopeKey: string;
  loading?: React.ElementType;
}>;

function Messages({
  scope,
  scopeKey = "messages",
  loading: LoadingComp = Loading,
}: MessageProps) {
  const player = usePlayer();

  if (!scope || !player) {
    return <LoadingComp />;
  }

  player.getAttribute("avatar");
  const msgs = scope.getAttribute(scopeKey);

  console.log(msgs);

  return null;
}

type InputProps = WithChildren<{
  onNewMessage: (msg: string) => void;
}>;

function Input({ onNewMessage }: InputProps) {
  const [text, setText] = useState("");

  const resize = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "inherit";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  const handleSubmit = (
    e:
      | FormEvent<HTMLFormElement>
      | KeyboardEvent<HTMLTextAreaElement>
      | MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    const txt = text.trim();
    if (txt === "") {
      return;
    }

    if (txt.length > 1024) {
      e.preventDefault();

      alert("Max message length is 1024");

      return;
    }

    onNewMessage(txt);
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    console.log(e.key);
    if (e.key === "Enter" && e.shiftKey === false) {
      handleSubmit(e);
      resize(e);
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    resize(e);
  };

  return (
    <form
      className="p-2 flex items-strech gap-2 border-t"
      onSubmit={handleSubmit}
    >
      <textarea
        name="message"
        id="message"
        rows={1}
        className="peer resize-none bg-transparent block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        placeholder="Say something"
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        type="button"
        className="rounded-md bg-gray-300 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={handleSubmit}
      >
        Send
      </button>
    </form>
  );
}
