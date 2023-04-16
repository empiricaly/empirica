import React, {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Attribute } from "../../../../shared/attributes";
import { Attributable } from "../../../../shared/scopes";
import { Loading } from "../../../react";
import { WithChildren } from "../../../react/helpers";
import { usePlayer } from "../hooks";

export type ChatProps = WithChildren<{
  scope: Attributable;
  scopeKey: string;
  loading?: React.ElementType;
}>;

export type Message = {
  text: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
};

export function Chat({
  scope,
  scopeKey = "messages",
  loading: LoadingComp = Loading,
}: ChatProps) {
  const player = usePlayer();

  if (!scope || !player) {
    return <LoadingComp />;
  }

  const handleNewMessage = (text: string) => {
    scope.append(scopeKey, {
      text,
      sender: {
        id: player!.id,
        name: player!.get("name") || player!.id,
        avatar: player!.get("avatar"),
      },
    } as Message);
  };

  const msgs = scope.getAttribute(scopeKey)?.items || [];

  return (
    <div className="h-full w-full flex flex-col">
      <Messages msgs={msgs} />

      <Input onNewMessage={handleNewMessage} />
    </div>
  );
}

type MessagesProps = WithChildren<{
  msgs: Attribute[];
}>;

function Messages(props: MessagesProps) {
  const { msgs } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    if (!scroller.current) {
      return;
    }

    if (msgCount !== msgs.length) {
      setMsgCount(msgs.length);
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [scroller, props, msgCount]);

  return (
    <div className="h-full overflow-auto pl-2 pr-4 pb-2" ref={scroller}>
      {msgs.map((msg) => (
        <MessageComp key={msg.id} attribute={msg} />
      ))}
    </div>
  );
}

type MessageProps = WithChildren<{
  attribute: Attribute;
}>;

function MessageComp({ attribute }: MessageProps) {
  const msg = attribute.value as Message;
  const ts = attribute.createdAt;

  let avatar = msg.sender.avatar;
  if (!avatar) {
    avatar = `https://avatars.dicebear.com/api/identicon/${msg.sender.id}.svg`;
  }

  let avatarImage = (
    <img
      className="inline-block h-9 w-9 rounded-full"
      src={avatar}
      alt={msg.sender.id}
    />
  );
  if (!avatar.startsWith("http")) {
    avatarImage = (
      <div className="inline-block h-9 w-9 rounded-full">{avatar}</div>
    );
  }

  return (
    <div className="flex items-start my-2">
      <div className="flex-shrink-0">{avatarImage}</div>
      <div className="ml-3 text-sm">
        <p>
          <span className="font-semibold text-gray-900 group-hover:text-gray-800">
            {msg.sender.name}
          </span>

          <span className="pl-2 text-gray-400">{ts && relTime(ts)}</span>
        </p>
        <p className="text-gray-900 group-hover:text-gray-800">{msg.text}</p>
      </div>
    </div>
  );
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

function relTime(date: Date) {
  const difference = (new Date().getTime() - date.getTime()) / 1000;

  if (difference < 60) {
    return `now`;
  } else if (difference < 3600) {
    return `${Math.floor(difference / 60)}m`;
  } else if (difference < 86400) {
    return `${Math.floor(difference / 3600)}h`;
  } else if (difference < 2620800) {
    return `${Math.floor(difference / 86400)} days ago`;
  } else if (difference < 31449600) {
    return `${Math.floor(difference / 2620800)} months ago`;
  } else {
    return `${Math.floor(difference / 31449600)} years ago`;
  }
}

// function getRelativeTimeString(
//   date: Date | number,
//   lang = navigator.language
// ): string {
//   // Allow dates or times to be passed
//   const timeMs = typeof date === "number" ? date : date.getTime();

//   // Get the amount of seconds between the given date and now
//   const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

//   // Array reprsenting one minute, hour, day, week, month, etc in seconds
//   const cutoffs = [
//     60,
//     3600,
//     86400,
//     86400 * 7,
//     86400 * 30,
//     86400 * 365,
//     Infinity,
//   ];

//   // Array equivalent to the above but in the string representation of the units
//   const units: Intl.RelativeTimeFormatUnit[] = [
//     "second",
//     "minute",
//     "hour",
//     "day",
//     "week",
//     "month",
//     "year",
//   ];

//   // Grab the ideal cutoff unit
//   const unitIndex = cutoffs.findIndex(
//     (cutoff) => cutoff > Math.abs(deltaSeconds)
//   );

//   // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
//   // is one day in seconds, so we can divide our seconds by this to get the # of days
//   const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

//   // Intl.RelativeTimeFormat do its magic
//   const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
//   return rtf.format(Math.floor(deltaSeconds / divisor!), units[unitIndex]!);
// }
