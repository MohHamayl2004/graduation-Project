import Sidebar from "../../components/layout/Sidebar";
import { useTutorChat } from "../../hooks/useTutorChat";
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import MainChat from "./MainChat";
import { useState } from "react";

export default function AITutor() {
  const chat = useTutorChat();
  const { state, signedIn, openChat, newChat, removeChat } = chat;
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="app-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="aiTutor" />
        <MainChat chat={chat} onHistory={() => setHistoryOpen(true)} />
        {signedIn && (
          <ChatHistoryPanel
            chats={state.chats}
            activeId={state.chatId}
            busy={state.phase === "streaming"}
            mobileOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            onOpen={(id) => { openChat(id); setHistoryOpen(false); }}
            onNew={() => { newChat(); setHistoryOpen(false); }}
            onDelete={removeChat}
          />
        )}
      </div>
    </div>
  );
}
