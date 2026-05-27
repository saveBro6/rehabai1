import { ReactNode } from "react";

export function AdminTable<T extends { id: string }>({ title, rows, columns }: { title: string; rows: T[]; columns: Array<{ key: keyof T; label: string; render?: (row: T) => ReactNode }> }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-950">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>{columns.map((column) => <th key={String(column.key)} className="px-5 py-3 font-semibold">{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => <td key={String(column.key)} className="px-5 py-3 text-slate-700">{column.render ? column.render(row) : String(row[column.key] ?? "")}</td>)}
              </tr>
            )) : (
              <tr><td className="px-5 py-6 text-slate-500" colSpan={columns.length}>Chua co du lieu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
