'use client';

/** Shared building blocks for the admin panel and church portal. */

export function BarTop({ title, right }: { title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
      <h1 className="h-display text-xl">{title}</h1>
      {right}
    </div>
  );
}

export function Kpi({ label, value, delta, down, small }: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  down?: boolean;
  small?: string;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-white px-4 py-3.5">
      <div className="text-[11.5px] font-medium text-muted">{label}</div>
      <div className="my-0.5 font-display text-[28px] font-semibold text-ink">{value}</div>
      {delta ? (
        <div className={`text-[11px] font-semibold ${down ? 'text-wine' : 'text-olive-text'}`}>{delta}</div>
      ) : null}
      {small ? <div className="text-[11px] text-muted">{small}</div> : null}
    </div>
  );
}

export function Panel({ title, children, titleExtra }: {
  title?: React.ReactNode;
  titleExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      {title ? (
        <div className="h-display mb-2.5 text-[15px]">
          {title} {titleExtra}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function PriorityChip({ priority }: { priority: 'CRITICAL' | 'HIGH' | 'NORMAL' }) {
  const map = {
    CRITICAL: { label: 'Crítico', className: 'chip-wine' },
    HIGH: { label: 'Alto', className: 'chip-wheat' },
    NORMAL: { label: 'Normal', className: '' },
  }[priority];
  return <span className={`chip ${map.className}`}>{map.label}</span>;
}

export function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-field border border-line bg-white">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="border-b border-line bg-linen-2 px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.04em] text-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

/** Weight slider row used by the algorithm settings screen (RF-ADM-08). */
export function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-3 text-[13px]">
      <label className="w-[150px] flex-none font-medium">{label}</label>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1 accent-ink"
        aria-label={label}
      />
      <span className="w-10 flex-none text-right font-semibold text-ink">{value}%</span>
    </div>
  );
}

/** Weekly spark bars: indigo = signups, wheat = Plus conversions. */
export function SparkBars({ indigo, wheat }: { indigo: number[]; wheat: number[] }) {
  return (
    <div className="mt-1.5 flex h-[90px] items-end gap-1">
      {indigo.map((height, index) => (
        <i key={`i-${index}`} className="flex-1 rounded-t-[3px] bg-ink opacity-85" style={{ height: `${height}%` }} />
      ))}
      {wheat.map((height, index) => (
        <i key={`w-${index}`} className="flex-1 rounded-t-[3px] bg-wheat" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
