import React from "react";
import { Attributable } from "../../../../shared/scopes";
import { Loading } from "../../../react";
import { WithChildren } from "../../../react/helpers";
import { usePlayer } from "../hooks";

export type ChatProps = WithChildren<{
  scope: Attributable;
  key: string;
  loading?: React.ElementType;
}>;

export function Chat({
  scope,
  key = "messages",
  loading: LoadingComp = Loading,
}: ChatProps) {
  const player = usePlayer();

  if (!scope || !player) {
    return <LoadingComp />;
  }

  player.getAttribute("avatar");
  const msgs = scope.getAttribute(key);

  console.log(msgs);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="h-full">Messages</div>

      <Input />
    </div>
  );
}

export function Messages() {}
export function Input() {
  return (
    <div className="p-2 flex items-strech gap-1">
      <input
        type="text"
        name="message"
        id="message"
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        placeholder="Say something"
      />

      <button
        type="button"
        className="rounded-md bg-gray-300 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Send
      </button>
    </div>
  );
}
