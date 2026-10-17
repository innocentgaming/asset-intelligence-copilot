import React, { useState } from 'react';
import { User, SessionSummary } from '../types';
import {
  Plus,
  MessageSquare,
  BookOpen,
  RotateCcw,
  Download,
  Flame,
  ChevronDown,
  User as UserIcon,
  Check,
  X,
  Clock,
} from 'lucide-react';

interface SidebarProps {
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onOpenKnowledge: () => void;
  onResetMemory: () => Promise<void>;
  onDownloadTranscript: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  users,
  currentUser,
  onSelectUser,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onOpenKnowledge,
  onResetMemory,
  onDownloadTranscript,
  isOpen,
  onClose,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      await onResetMemory();
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-[260px] bg-industrial-900 light:bg-slate-50 border-r border-industrial-800 light:border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* App Title Header */}
        <div className="p-4 border-b border-industrial-800 light:border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight text-slate-100 light:text-slate-900 font-mono">
                Asset Intelligence
              </h1>
              <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">
                Copilot Console
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-200"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Switcher */}
        <div className="p-3 border-b border-industrial-800 light:border-slate-200 relative">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 mb-1.5">
            Active Operator
          </div>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-industrial-950 light:bg-white border border-industrial-800 light:border-slate-300 hover:border-amber-500/50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-amber-400 text-industrial-950 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                {currentUser ? getInitials(currentUser.name) : 'OP'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 light:text-slate-800 truncate">
                  {currentUser?.name || 'Select Operator'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.role || 'Field Operator'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
          </button>

          {/* User selection dropdown */}
          {showUserDropdown && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-industrial-950 light:bg-white border border-industrial-700 light:border-slate-300 rounded-lg shadow-2xl z-50 py-1 max-h-60 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => {
                    onSelectUser(user);
                    setShowUserDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-industrial-800 light:hover:bg-slate-100 transition ${
                    currentUser?.user_id === user.user_id ? 'bg-amber-400/10 text-amber-400 font-semibold' : 'text-slate-300 light:text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-6 h-6 rounded-full bg-industrial-800 light:bg-slate-200 font-mono text-[10px] flex items-center justify-center font-bold">
                      {getInitials(user.name)}
                    </span>
                    <div className="truncate">
                      <div>{user.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{user.role}</div>
                    </div>
                  </div>
                  {currentUser?.user_id === user.user_id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-industrial-950 font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Past Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>Past Sessions</span>
            <span>{sessions.length}</span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-6 px-3 text-xs text-slate-400 italic">
              No previous sessions for this operator.
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = currentSessionId === sess.session_id;
              return (
                <button
                  key={sess.session_id}
                  onClick={() => onSelectSession(sess.session_id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition group flex flex-col gap-1 ${
                    isActive
                      ? 'bg-industrial-800 light:bg-slate-200 border border-amber-500/40 text-amber-300 light:text-amber-700'
                      : 'hover:bg-industrial-800/60 light:hover:bg-slate-100 text-slate-300 light:text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 flex-shrink-0" />
                    <span className="truncate font-medium flex-1">
                      {sess.first_q || 'Untitled conversation'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pl-5">
                    <span>{sess.started ? sess.started.substring(0, 10) : ''}</span>
                    <span>{sess.n} {sess.n === 1 ? 'msg' : 'msgs'}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Actions: Shared Knowledge, Reset Memory, Download Transcript */}
        <div className="p-3 border-t border-industrial-800 light:border-slate-200 space-y-1.5 bg-industrial-950/50 light:bg-slate-100">
          <button
            onClick={onOpenKnowledge}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 light:text-slate-700 hover:bg-industrial-800 light:hover:bg-slate-200 transition"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Shared knowledge</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset memory</span>
          </button>

          <button
            onClick={onDownloadTranscript}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 light:text-slate-700 hover:bg-industrial-800 light:hover:bg-slate-200 transition"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Download transcript</span>
          </button>
        </div>
      </aside>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-industrial-900 light:bg-white border border-industrial-700 light:border-slate-300 rounded-xl max-w-sm w-full p-5 shadow-2xl text-slate-100 light:text-slate-900">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Reset Memory Store?
            </h3>
            <p className="text-xs text-slate-300 light:text-slate-600 mt-2 leading-relaxed">
              This will clear all ephemeral operator corrections, user-defined rules, claims, and past chat sessions.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
