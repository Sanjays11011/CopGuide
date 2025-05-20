import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LawCharacter from "../../assets/images/LawCharacter.jpeg";

const ChatInterface = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [qValues, setQValues] = useState(null);
  const chatBoxRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const [displayedTexts, setDisplayedTexts] = useState({});

  const examplePrompts = [
    "தடை செய்யப்பட்ட பகுதிகளுக்கு செல்வதற்காக பொது இடத்தில் ராணுவ சீருடை அணிந்து, ராணுவ வீரர் போல் நடந்து பிடிபட்டனர்.",
    "அண்டை நாட்டின் எல்லையில் சட்டவிரோதமாக ஒரு நபர் திருடப்பட்ட சொத்துகளை வாங்குகிறார். IPC பிரிவு 127ன் படி என்ன விளைவுகள்?",
    "ஒரு பொது ஊழியர் தப்பிக்க அனுமதிக்கிறார். IPC பிரிவு 128ன் கீழ் அவர் எதிர்கொள்ளக்கூடிய தண்டனை என்ன?",
    "தேசத்துரோகத்தை தூண்ட முயற்சித்ததற்காக, IPC பிரிவு 124A இன் கீழ் என்ன தண்டனைகளை எதிர்கொள்ளலாம்?",
  ];

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "ta-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
      };

      recognition.onend = () => {
        console.log("Voice recognition ended.");
      };

      recognitionRef.current = recognition;
    } else {
      console.error("Speech Recognition API not supported in this browser.");
    }
  }, []);

  useEffect(() => {
    const timers = {};

    messages.forEach((message) => {
      if (message.sender === "bot" && displayedTexts[message.id] !== message.text) {
        let index = displayedTexts[message.id]?.length || 0;
        const fullText = message.text;

        if (index < fullText.length) {
          timers[message.id] = setInterval(() => {
            setDisplayedTexts((prev) => ({
              ...prev,
              [message.id]: fullText.slice(0, index + 1),
            }));
            index++;
            if (index >= fullText.length) {
              clearInterval(timers[message.id]);
            }
          }, 10);
        }
      }
    });

    return () => {
      Object.values(timers).forEach((timer) => clearInterval(timer));
    };
  }, [messages, displayedTexts]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const logOut = () => {
    sessionStorage.removeItem("token");
    navigate("/");
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handlePromptClick = (prompt) => {
    setUserInput(prompt);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userInput) {
      setError("Please enter a message");
      return;
    }

    setShowPrompts(false);

    const userMessage = { sender: "user", text: userInput };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setUserInput("");
    setLoading(true);
    setError(null);
    setQValues(null);

    try {
      const result = await axios.post("http://127.0.0.1:5000/search", {
        question: userMessage.text,
      });
      console.log("Search response:", result.data);

      const botMessage = {
        sender: "bot",
        text: result.data.answer || "No response received.",
        id: Date.now(),
        feedback_id: result.data.feedback_id,
        doc_index: result.data.doc_index,
        feedbackGiven: false,
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
      setDisplayedTexts((prev) => ({ ...prev, [botMessage.id]: "" }));
    } catch (err) {
      console.error("Search error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Error fetching data from the chatbot.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId, feedbackScore) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message || message.feedbackGiven) {
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:5000/feedback", {
        feedback_id: message.feedback_id,
        feedback: feedbackScore,
        doc_index: message.doc_index,
      });
      console.log("Feedback response:", response.data);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, feedbackGiven: true } : msg
        )
      );
    } catch (err) {
      console.error("Feedback error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Error submitting feedback.");
    }
  };

  const handleFetchQValues = async () => {
    if (!userInput && messages.length === 0) {
      setError("Please enter or select a question first.");
      return;
    }

    const question = userInput || messages[messages.length - 1]?.text;
    if (!question) {
      setError("No question available to fetch Q-values.");
      return;
    }

    try {
      const response = await axios.get("http://127.0.0.1:5000/qvalues", {
        params: { question },
      });
      console.log("Q-values response:", response.data);
      setQValues(response.data);
    } catch (err) {
      console.error("Q-values error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Error fetching Q-values.");
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-r from-[#1a1a2e] to-[#16213e] font-inter">
      <div
        className={`transition-all duration-300 p-2 pt-5 flex flex-col h-screen ${
          isSidebarExpanded
            ? "w-1/4 bg-[#1e293b]/90 backdrop-blur-md"
            : "w-16 bg-[#1e293b]"
        }`}
      >
        <button
          onClick={toggleSidebar}
          className="text-gray-300 focus:outline-none hover:scale-105 transition-transform"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="3em"
            height="3em"
            viewBox="0 0 24 24"
            className="border-2 bg-[#334155] border-[#475569] rounded-full p-2"
          >
            <path
              fill="none"
              stroke="#f8fafc"
              stroke-linecap="round"
              stroke-width="1.5"
              d="M20 7H4m16 5H4m16 5H4"
            />
          </svg>
        </button>
        <div className="flex-grow flex flex-col justify-between">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="3em"
            height="3em"
            viewBox="0 0 24 24"
            className="mt-5 border-2 bg-[#334155] border-[#475569] rounded-full p-2 hover:scale-105 transition-transform"
          >
            <path fill="#f8fafc" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="3em"
            height="3em"
            viewBox="0 0 24 24"
            className="mb-5 border-2 bg-[#334155] border-[#475569] rounded-full p-2 hover:scale-105 transition-transform"
          >
            <g
              fill="none"
              stroke="#f8fafc"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2" />
              <path d="M4.271 18.346S6.5 15.5 12 15.5s7.73 2.846 7.73 2.846M12 12a3 3 0 1 0 0-6a3 3 0 0 0 0 6" />
            </g>
          </svg>
        </div>
      </div>

      <div className="flex flex-col w-full bg-[#0f172a]">
        <div className="flex items-center justify-between m-5">
          <div className="flex items-center">
            <img
              src={LawCharacter}
              alt="Copsify AI"
              width="60px"
              height="60px"
              className="border-2 border-[#06b6d4] rounded-full shadow-md"
            />
            <div className="ml-3">
              <p className="font-bold text-[#f8fafc] bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] bg-clip-text text-transparent">
                Copsify AI
              </p>
              <div className="flex items-center gap-2 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#34A853"
                    d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"
                  />
                </svg>
                <p className="text-[#cbd5e1]">Always active</p>
              </div>
            </div>
          </div>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div
              onClick={toggleDropdown}
              className="cursor-pointer hover:scale-105 transition-transform"
              aria-label="User menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="3em"
                height="3em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#f8fafc"
                  fillRule="evenodd"
                  d="M12 4a8 8 0 0 0-6.96 11.947A4.99 4.99 0 0 1 9 14h6a4.99 4.99 0 0 1 3.96 1.947A8 8 0 0 0 12 4m7.943 14.076q.188-.245.36-.502A9.96 9.96 0 0 0 22 12c0-5.523-4.477-10-10-10S2 6.477 2 12a9.96 9.96 0 0 0 2.057 6.076l-.005.018l.355.413A9.98 9.98 0 0 0 12 22q.324 0 .644-.02a9.95 9.95 0 0 0 5.031-1.745a10 10 0 0 0 1.918-1.728l.355-.413zM12 6a3 3 0 1 0 0 6a3 3 0 0 0 0 6"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {isOpen && (
              <div
                className="absolute top-14 right-0 bg-[#1e293b]/90 backdrop-blur-md shadow-lg p-2 px-3 rounded-md z-50 border border-[#475569]"
                onClick={logOut}
              >
                <p className="m-0 cursor-pointer text-[#f8fafc] hover:text-[#06b6d4] transition-colors">
                  Logout
                </p>
              </div>
            )}
          </div>
        </div>

        {showPrompts && (
          <div>
            <div className="pl-10 pb-2 bg-[#0f172a] flex flex-col items-center">
              <h1 className="md:text-5xl h-16 text-2xl font-semibold bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] bg-clip-text text-transparent">
                Hello, <span>Ragavan</span>
              </h1>
              <p className="text-[#cbd5e1] mt-2 md:text-5xl text-2xl">
                How can I help you today?
              </p>
            </div>
            <div className="px-5 pt-5">
              <div className="grid md:grid-cols-4 grid-cols-2 gap-4">
                {examplePrompts.map((prompt, index) => (
                  <div
                    key={index}
                    className="border-2 border-[#475569] p-4 rounded-lg bg-[#1e293b]/90 backdrop-blur-md cursor-pointer hover:border-[#06b6d4] transition-all animate-fade-in"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    <p className="text-[#cbd5e1] md:text-base text-xs">
                      {prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatBoxRef} className="flex-grow p-5 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 text-lg animate-fade-in ${
                message.sender === "user"
                  ? "text-right"
                  : "text-left leading-relaxed"
              }`}
            >
              <div
                className={`inline-block p-4 rounded-lg shadow-md ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-[#f8fafc]"
                    : "bg-[#1e293b]/90 backdrop-blur-md text-[#f8fafc] border border-[#475569]"
                }`}
              >
                <p>
                  {message.sender === "bot"
                    ? displayedTexts[message.id] || ""
                    : message.text}
                </p>
                {message.sender === "bot" && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleFeedback(message.id, 1)}
                      disabled={message.feedbackGiven}
                      className={`p-1 ${
                        message.feedbackGiven
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-[0_0_8px_#34A853] transition-shadow"
                      }`}
                      title="Positive feedback"
                      aria-label="Positive feedback"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1.5em"
                        height="1.5em"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="#34A853"
                          d="M13 2v11h8V7zm2 2.75c0-.69.56-1.25 1.25-1.25S17.5 4.06 17.5 4.75S16.94 6 16.25 6S15 5.44 15 4.75M4 4v16l5-2l5 2V8z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, -1)}
                      disabled={message.feedbackGiven}
                      className={`p-1 ${
                        message.feedbackGiven
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-[0_0_8px_#EA4335] transition-shadow"
                      }`}
                      title="Negative feedback"
                      aria-label="Negative feedback"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1.5em"
                        height="1.5em"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="#EA4335"
                          d="M13 22v-9h8v6zm2-2.25c0 .69.56 1.25 1.25 1.25S17.5 20.44 17.5 19.75S16.94 18.5 16.25 18.5S15 19.06 15 19.75M4 20V4l5 2l5-2v12z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {qValues && (
            <div className="mt-4 p-4 bg-[#1e293b]/90 backdrop-blur-md rounded-lg border border-[#475569] shadow-lg animate-fade-in">
              <h3 className="text-[#f8fafc] font-semibold">
                Q-Values for "{qValues.question}"
              </h3>
              <p className="text-[#cbd5e1]">{qValues.message}</p>
              {qValues.q_values.length > 0 ? (
                <ul className="text-[#f8fafc]">
                  {qValues.q_values.map((qv, index) => (
                    <li key={index}>
                      Document {qv.doc_index}: Q-Value = {qv.q_value.toFixed(3)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#cbd5e1]">No Q-values available.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 flex items-center gap-3">
          <form onSubmit={handleSubmit} className="flex w-full items-center relative">
            <input
              type="text"
              placeholder="Type a prompt here..."
              value={userInput}
              onChange={handleInputChange}
              className="flex-grow p-3 pr-12 rounded-full bg-[#1e293b] border border-[#475569] text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-transparent shadow-inner max-w-[calc(100%-50px)] placeholder-[#cbd5e1] transition-all"
              aria-label="Chat input"
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              className="text-[#f8fafc] p-2 rounded-full absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-[#334155] transition-all"
              aria-label="Start voice input"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.5em"
                height="1.5em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#f8fafc"
                  d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2t2.125.875T15 5v6q0 1.25-.875 2.125T12 14m-1 7v-3.075q-2.6-.35-4.3-2.325T5 11h2q0 2.075 1.463 3.538T12 16t3.538-1.463T17 11h2q0 2.625-1.7 4.6T13 17.925V21zm1-9q.425 0 .713-.288T13 11V5q0-.425-.288-.712T12 4t-.712.288T11 5v6q0 .425.288.713T12 12"
                />
              </svg>
            </button>
          </form>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`p-3 rounded-full ${
              loading
                ? "bg-[#334155] cursor-not-allowed"
                : "bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] hover:shadow-[0_0_12px_#06b6d4] transition-all"
            }`}
            aria-label="Send message"
          >
            {loading ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="2em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#f8fafc"
                  d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z"
                  opacity="0.5"
                />
                <path
                  fill="#f8fafc"
                  d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z"
                >
                  <animateTransform
                    attributeName="transform"
                    dur="1s"
                    from="0 12 12"
                    repeatCount="indefinite"
                    to="360 12 12"
                    type="rotate"
                  />
                </path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="2em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#f8fafc"
                  d="M3 20v-6l8-2l-8-2V4l19 8z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={handleFetchQValues}
            className="p-3 bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] rounded-full text-[#f8fafc] hover:shadow-[0_0_12px_#06b6d4] transition-all"
            title="Fetch Q-Values"
            aria-label="Fetch Q-Values"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.5em"
              height="1.5em"
              viewBox="0 0 24 24"
            >
              <path
                fill="#f8fafc"
                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8zm4-9h-3V8h-2v3H8v2h3v3h2v-3h3z"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="text-[#f87171] text-center mt-2 animate-fade-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;