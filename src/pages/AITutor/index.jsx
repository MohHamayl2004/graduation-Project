import Sidebar from "../../components/layout/Sidebar";
import { useTutorChat } from "../../hooks/useTutorChat";
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import MainChat from "./MainChat";

export default function AITutor() {
  const chat = useTutorChat();
  const { state, signedIn, openChat, newChat, removeChat } = chat;

  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="aiTutor" />
        <MainChat chat={chat} />
        {signedIn && (
          <ChatHistoryPanel
            chats={state.chats}
            activeId={state.chatId}
            busy={state.phase === "streaming"}
            onOpen={openChat}
            onNew={newChat}
            onDelete={removeChat}
          />
        )}
      </div>
    </div>
  );
}
