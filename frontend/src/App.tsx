import "./App.css";
import { ChatWindow } from "./components/chat/ChatWindow";

function App() {
  return (
    <div className="app">
      <header className="app-header">Personal Chatbot</header>
      <ChatWindow />
    </div>
  );
}

export default App;
