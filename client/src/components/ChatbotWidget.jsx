import { useState } from 'react';
import { sendChatbotMessage } from '../services/chatbotService';

const T = {
  navy: '#050D1F',
  navyMid: '#0B1730',
  surface: '#0F1E38',
  teal: '#00C6FF',
  white: '#FFFFFF',
  slate: '#8DA5C4',
  muted: '#4A6080',
  border: 'rgba(0,198,255,0.12)',
  borderH: 'rgba(0,198,255,0.32)',
  gradient: 'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
};

const starterMessages = [
  'Show my pending requests',
  'Which role should I request for reporting?',
  'Explain approval workflow',
];

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi, I am your EARMS assistant. I answer from local system data about requests, roles, approvals, risk, and justifications.',
      sources: [],
      suggestions: starterMessages,
    },
  ]);

  const send = async (text = input) => {
    const message = text.trim();
    if (!message || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setLoading(true);

    try {
      const data = await sendChatbotMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          sources: data.sources || [],
          suggestions: data.suggestions || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.response?.data?.message || 'I could not reach the local assistant service right now.',
          sources: [],
          suggestions: starterMessages,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', right: '1.35rem', bottom: '1.35rem', zIndex: 1600 }}>
      {open && (
        <section
          aria-label="EARMS AI assistant"
          style={{
            width: 'min(390px, calc(100vw - 2rem))',
            height: 'min(620px, calc(100vh - 6rem))',
            background: T.surface,
            border: `1px solid ${T.borderH}`,
            borderRadius: '14px',
            boxShadow: '0 24px 70px rgba(0,0,0,.45)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '.8rem',
          }}
        >
          <header style={{ padding: '1rem', borderBottom: `1px solid ${T.border}`, background: T.navyMid }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' }}>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: T.white, fontSize: '.98rem' }}>
                  EARMS Assistant
                </p>
                <p style={{ color: T.muted, fontSize: '.74rem', marginTop: '.15rem' }}>
                  Local RAG. No paid API key required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  color: T.slate,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                x
              </button>
            </div>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div key={`${message.role}-${index}`} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                  <div
                    style={{
                      background: isUser ? 'rgba(0,198,255,.14)' : T.navyMid,
                      border: `1px solid ${isUser ? T.borderH : T.border}`,
                      color: T.white,
                      borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      padding: '.78rem .9rem',
                      fontSize: '.84rem',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {message.text}
                  </div>

                  {!isUser && message.sources?.length > 0 && (
                    <div style={{ marginTop: '.45rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                      {message.sources.slice(0, 3).map((source) => (
                        <span
                          key={source.id}
                          title={source.title}
                          style={{
                            border: `1px solid ${T.border}`,
                            color: T.muted,
                            borderRadius: '100px',
                            padding: '.15rem .45rem',
                            fontSize: '.66rem',
                            maxWidth: '130px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {source.type}: {source.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isUser && message.suggestions?.length > 0 && (
                    <div style={{ marginTop: '.5rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                      {message.suggestions.slice(0, 3).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => send(suggestion)}
                          style={{
                            border: `1px solid ${T.border}`,
                            background: 'rgba(0,198,255,.05)',
                            color: T.teal,
                            borderRadius: '100px',
                            padding: '.32rem .55rem',
                            fontSize: '.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: T.navyMid, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '.75rem .9rem', color: T.slate, fontSize: '.82rem' }}>
                Thinking from local knowledge...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            style={{ padding: '.85rem', borderTop: `1px solid ${T.border}`, background: T.navyMid, display: 'flex', gap: '.55rem' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about requests, roles, risk..."
              style={{
                flex: 1,
                minWidth: 0,
                background: T.surface,
                border: `1px solid ${T.border}`,
                color: T.white,
                borderRadius: '10px',
                padding: '.72rem .85rem',
                fontSize: '.84rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: '42px',
                border: 'none',
                borderRadius: '10px',
                background: loading || !input.trim() ? 'rgba(0,198,255,.22)' : T.gradient,
                color: T.navy,
                fontWeight: 800,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
              aria-label="Send message"
            >
              ^
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Hide assistant' : 'Open assistant'}
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '15px',
          border: `1px solid ${T.borderH}`,
          background: T.gradient,
          color: T.navy,
          boxShadow: '0 14px 38px rgba(0,198,255,.28)',
          cursor: 'pointer',
          fontFamily: "'Syne',sans-serif",
          fontWeight: 900,
          fontSize: '1.05rem',
        }}
      >
        AI
      </button>
    </div>
  );
};

export default ChatbotWidget;
