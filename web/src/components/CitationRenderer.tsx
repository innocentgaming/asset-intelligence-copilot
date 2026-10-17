import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CitationRendererProps {
  content: string;
}

interface CitationKind {
  kind: string;
  style: string;
}

export function getCitationKind(token: string): CitationKind | null {
  const inner = token.replace(/^\[|\]$/g, '').trim();
  const upper = inner.toUpperCase();

  if (upper.startsWith('INS-')) {
    return {
      kind: 'Inspection Record',
      style: 'bg-sky-950/80 border-sky-500/60 text-sky-300 hover:border-sky-400',
    };
  }
  if (upper.startsWith('MNT-') || upper.startsWith('REP-')) {
    return {
      kind: 'Maintenance / Repair Event',
      style: 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:border-amber-400',
    };
  }
  if (upper.startsWith('REG-')) {
    return {
      kind: 'Regulator Compliance Event',
      style: 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:border-rose-400',
    };
  }
  if (upper.startsWith('CTX-') || upper.startsWith('CLM-')) {
    return {
      kind: 'Field Operator Claim / Note',
      style: 'bg-purple-950/80 border-purple-500/60 text-purple-300 hover:border-purple-400',
    };
  }
  if (upper.startsWith('COR-')) {
    return {
      kind: 'Telemetry Sensor Correction',
      style: 'bg-fuchsia-950/80 border-fuchsia-500/60 text-fuchsia-300 hover:border-fuchsia-400',
    };
  }
  if (upper.startsWith('WELL-')) {
    return {
      kind: 'Well Asset ID',
      style: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:border-emerald-400',
    };
  }
  if (
    upper.includes('MANUAL') ||
    upper.includes('SOP') ||
    upper.includes('RULE') ||
    upper.includes('SR-') ||
    inner.includes('§')
  ) {
    return {
      kind: 'Standard Operating Procedure / Manual',
      style: 'bg-slate-800/80 border-slate-600/80 text-slate-200 hover:border-slate-400',
    };
  }

  return null;
}

export const CitationChip: React.FC<{ token: string }> = ({ token }) => {
  const info = getCitationKind(token);
  if (!info) {
    return <span>{token}</span>;
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 my-0.5 mx-0.5 rounded text-[11px] font-mono border transition-all cursor-default shadow-sm ${info.style}`}
      title={`${info.kind}: ${token}`}
    >
      {token}
    </span>
  );
};

// Function that parses text segments to identify citation tokens
export const renderTextWithCitations = (text: string): React.ReactNode => {
  if (!text) return null;

  // Regex matching square bracket expressions like [INS-0001-0203] or [T200 manual §9.3]
  const regex = /(\[[A-Za-z0-9\-_§\.\s/]+\])/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      const kind = getCitationKind(part);
      if (kind) {
        return <CitationChip key={index} token={part} />;
      }
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

export const MarkdownContent: React.FC<CitationRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body text-slate-200 light:text-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize text nodes to convert citations to chips
          p: ({ children }) => {
            return (
              <p className="mb-2.5 last:mb-0 leading-relaxed">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderTextWithCitations(child);
                  }
                  return child;
                })}
              </p>
            );
          },
          li: ({ children }) => {
            return (
              <li className="mb-1 leading-relaxed">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderTextWithCitations(child);
                  }
                  return child;
                })}
              </li>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-100 light:text-slate-900">
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-industrial-950 light:bg-slate-200 text-amber-300 light:text-amber-700 font-mono text-xs border border-industrial-800 light:border-slate-300">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
