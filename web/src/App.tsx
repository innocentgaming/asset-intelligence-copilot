import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  UserMetaResponse,
  ChatMessage,
  SessionSummary,
} from './types';
import {
  fetchUserMeta,
  fetchUserSessions,
  fetchSessionTurns,
  sendChatMessage,
  resetMemory,
  downloadTranscriptText,
} from './api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatThread } from './components/ChatThread';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
import { KnowledgeDrawer } from './components/KnowledgeDrawer';
import { SkillModal } from './components/SkillModal';

export const App: React.FC = () => {
  // Theme state (dark default)
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('flytops_theme') !== 'light';
  });

  // App & User metadata
  const [meta, setMeta] = useState<UserMetaResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Chat conversation state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Drawer & Sidebar mobile state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState<boolean>(false);
  const [isSkillHubOpen, setIsSkillHubOpen] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Apply dark class to root HTML
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('flytops_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('flytops_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Initial Load: Fetch Users & Meta
  useEffect(() => {
    const init = async () => {
      try {
        const metaData = await fetchUserMeta();
        setMeta(metaData);
        if (metaData.users && metaData.users.length > 0) {
          const defaultUser = metaData.users[0];
          setCurrentUser(defaultUser);
          loadUserSessions(defaultUser.user_id);
        }
      } catch (err) {
        console.error('Failed to load user meta:', err);
      }
    };
    init();
  }, []);

  // Load Sessions for a specific user
  const loadUserSessions = async (userId: string) => {
    try {
      const userSessions = await fetchUserSessions(userId);
      setSessions(userSessions);
    } catch (err) {
      console.error('Failed to load user sessions:', err);
    }
  };

  // Switch Active User (resets active conversation)
  const handleSelectUser = (user: User) => {
    if (currentUser?.user_id === user.user_id) return;
    setCurrentUser(user);
    setCurrentSessionId(null);
    setMessages([]);
    loadUserSessions(user.user_id);
  };

  // Start New Chat
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  // Open Past Session
  const handleSelectSession = async (sessionId: string) => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      setCurrentSessionId(sessionId);
      setIsSidebarOpen(false);
      const turns = await fetchSessionTurns(currentUser.user_id, sessionId);

      const loadedMessages: ChatMessage[] = [];
      turns.forEach((turn, idx) => {
        // User turn
        loadedMessages.push({
          id: `turn-q-${idx}`,
          role: 'user',
          content: turn.question,
          timestamp: 'History',
        });
        // Assistant turn
        loadedMessages.push({
          id: `turn-a-${idx}`,
          role: 'assistant',
          content: turn.answer,
          visuals: turn.visual,
          wells: turn.wells,
          timestamp: 'History',
        });
      });

      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load past session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (text: string) => {
    if (!currentUser || !text.trim() || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await sendChatMessage(currentUser.user_id, text, currentSessionId);

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        visuals: res.visuals,
        sources: res.sources,
        wells: res.wells,
        trace: res.trace,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...newMessages, assistantMessage]);
      setCurrentSessionId(res.session_id);

      // Refresh past sessions list
      loadUserSessions(currentUser.user_id);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: err.message || 'An error occurred while executing the query.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Memory
  const handleResetMemory = async () => {
    try {
      await resetMemory();
      setMessages([]);
      setCurrentSessionId(null);
      if (currentUser) {
        await loadUserSessions(currentUser.user_id);
      }
    } catch (err) {
      console.error('Failed to reset memory:', err);
    }
  };

  // Download Transcript
  const handleDownloadTranscript = async () => {
    try {
      const markdown = await downloadTranscriptText();
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `copilot-transcript-${new Date().toISOString().slice(0, 10)}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download transcript:', err);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-industrial-950 light:bg-slate-50 text-slate-100 light:text-slate-900">
      {/* 260px Sidebar */}
      <Sidebar
        users={meta?.users || []}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onResetMemory={handleResetMemory}
        onDownloadTranscript={handleDownloadTranscript}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header Bar */}
        <Header
          meta={meta}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKnowledge={() => setIsKnowledgeOpen(true)}
          onOpenSkillHub={() => setIsSkillHubOpen(true)}
        />

        {/* Scrollable Chat or Empty State */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={handleSendMessage} />
          ) : (
            <ChatThread
              messages={messages}
              isLoading={isLoading}
              onRetry={(prompt) => {
                if (prompt) handleSendMessage(prompt);
              }}
            />
          )}
        </main>

        {/* Pinned Bottom Composer */}
        <Composer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!currentUser}
        />
      </div>

      {/* Shared Knowledge Right Drawer */}
      <KnowledgeDrawer
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />

      {/* Agent Skills & Gemma 4 Modal */}
      <SkillModal
        isOpen={isSkillHubOpen}
        onClose={() => setIsSkillHubOpen(false)}
      />
    </div>
  );
};

export default App;
