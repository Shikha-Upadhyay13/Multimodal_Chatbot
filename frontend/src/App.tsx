import { useState } from "react";
import "./App.css";
import { ChatWindow } from "./components/chat/ChatWindow";
import { Sidebar } from "./components/layout/Sidebar";

function App() {
  const [chatKey, setChatKey] = useState(0);

  return (
    <div className="app-shell">
      <Sidebar onNewChat={() => setChatKey((k) => k + 1)} />
      <ChatWindow key={chatKey} />
    </div>
  );
}

export default App;
