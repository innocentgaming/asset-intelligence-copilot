import React, { useState } from 'react';
import { Copy, Check, Table as TableIcon } from 'lucide-react';

interface DataTableProps {
  columns: string[];
  rows: (string | number)[][];
  title?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ columns, rows, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCSV = () => {
    if (!columns || !rows) return;
    const headerLine = columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    const rowLines = rows.map(r =>
      r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCellStyling = (cellValue: string | number) => {
    const val = String(cellValue).trim().toLowerCase();
    const isNumber = typeof cellValue === 'number' || (!isNaN(Number(cellValue)) && val !== '');

    let tintClass = '';
    if (val === 'no' || val === 'breach' || val === 'out of date' || val === 'overdue' || val === 'not producing' || val === 'fail') {
      tintClass = 'bg-rose-950/40 text-rose-400 font-semibold border-rose-900/40';
    } else if (val === 'yes' || val === 'met' || val === 'producing' || val === 'pass' || val === 'compliant') {
      tintClass = 'bg-emerald-950/40 text-emerald-400 font-semibold border-emerald-900/40';
    }

    return {
      isNumber,
      tintClass,
    };
  };

  return (
    <div className="bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl overflow-hidden shadow-lg my-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-industrial-950/80 light:bg-slate-100 border-b border-industrial-800 light:border-slate-200">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200 light:text-slate-800">
            {title || `Data Table (${rows.length} rows)`}
          </span>
        </div>
        <button
          onClick={handleCopyCSV}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-industrial-800 hover:bg-industrial-700 light:bg-slate-200 light:hover:bg-slate-300 text-slate-200 light:text-slate-800 rounded transition border border-industrial-700 light:border-slate-300"
          title="Copy table to clipboard as CSV"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy CSV'}</span>
        </button>
      </div>

      {/* Table Container with max height 480px, sticky header, scroll */}
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-industrial-950 light:bg-slate-100 text-slate-400 light:text-slate-600 sticky top-0 z-10 border-b border-industrial-800 light:border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-3.5 py-2.5 font-semibold font-mono tracking-wider text-[11px] uppercase whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-800/60 light:divide-slate-200">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`transition-colors hover:bg-industrial-800/40 light:hover:bg-slate-100/60 ${
                  rIdx % 2 === 0 ? 'bg-industrial-900/80 light:bg-white' : 'bg-industrial-950/40 light:bg-slate-50'
                }`}
              >
                {row.map((cell, cIdx) => {
                  const { isNumber, tintClass } = getCellStyling(cell);
                  return (
                    <td
                      key={cIdx}
                      className={`px-3.5 py-2 whitespace-nowrap text-slate-300 light:text-slate-800 font-mono text-xs ${
                        isNumber ? 'text-right' : 'text-left'
                      } ${tintClass}`}
                    >
                      {cell !== null && cell !== undefined ? String(cell) : '--'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
