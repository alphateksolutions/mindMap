import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { parseISO } from "date-fns";
import { Clock, FileText, Info, Tags, Trash2, X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { useStore } from "../../store/useStore";
import { getComputedStatus } from "../../utils";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{children}</label>;
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100";

export default function RightPanel() {
  const { nodes, selectedNodeId, setSelectedNode, updateNode, deleteNode } = useStore();
  const node = nodes.find(n => n.id === selectedNodeId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setShowDeleteConfirm(false);
    }
  }, [node?.id, node?.title, node?.content]);

  const hasTextChanges = useMemo(() => Boolean(node && (title !== node.title || content !== node.content)), [content, node, title]);

  const saveTextFields = () => {
    if (!node || !hasTextChanges) return;
    updateNode(node.id, { title, content });
    toast.success("Da luu node");
  };

  const handleDelete = () => {
    if (!node) return;
    deleteNode(node.id);
    setShowDeleteConfirm(false);
    toast.success("Da xoa node");
  };

  if (!node) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-slate-50/90 p-4 lg:flex lg:flex-col">
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
          <div className="mb-4 rounded-2xl bg-indigo-50 p-4 text-indigo-600">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Chon mot node de chinh sua</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Thong tin node, thoi gian, notes va hanh dong se hien thi tai day.</p>
        </div>
      </aside>
    );
  }

  const status = getComputedStatus(node);
  const isProjectNode = node.type === "project";

  return (
    <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-slate-50/90 lg:flex lg:flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">Node Editor</h2>
            {hasTextChanges && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Chua luu
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-medium capitalize text-slate-500">{node.type} / {status}</p>
        </div>
        <button onClick={() => setSelectedNode(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Dong editor" aria-label="Dong editor">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Section title="Thong tin co ban" icon={<Info className="h-3.5 w-3.5" />}>
          <div>
            <FieldLabel>Title</FieldLabel>
            <input
              type="text"
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Node title"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Type</FieldLabel>
              <span className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold capitalize text-slate-600">{node.type}</span>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={node.status}
                onChange={(event) => updateNode(node.id, { status: event.target.value as any })}
                className={inputClass + " capitalize"}
              >
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Priority</FieldLabel>
            <select
              value={node.priority}
              onChange={(event) => updateNode(node.id, { priority: event.target.value as any })}
              className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold capitalize text-amber-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </Section>

        <Section title="Thoi gian" icon={<Clock className="h-3.5 w-3.5" />}>
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Start time</FieldLabel>
              {node.startTime && <button onClick={() => updateNode(node.id, { startTime: null })} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">Clear</button>}
            </div>
            <DatePicker
              selected={node.startTime ? parseISO(node.startTime) : null}
              onChange={(date: Date | null) => updateNode(node.id, { startTime: date ? date.toISOString() : null })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="dd/MM/yyyy HH:mm"
              className={inputClass}
              placeholderText="Chon thoi gian bat dau"
              wrapperClassName="w-full"
              portalId="root"
              popperPlacement="bottom-end"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Due time</FieldLabel>
              {node.dueTime && <button onClick={() => updateNode(node.id, { dueTime: null })} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">Clear</button>}
            </div>
            <DatePicker
              selected={node.dueTime ? parseISO(node.dueTime) : null}
              onChange={(date: Date | null) => updateNode(node.id, { dueTime: date ? date.toISOString() : null })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="dd/MM/yyyy HH:mm"
              className={inputClass}
              placeholderText="Chon han hoan thanh"
              wrapperClassName="w-full"
              portalId="root"
              popperPlacement="bottom-end"
            />
          </div>
        </Section>

        {status === "overdue" && (
          <Section title="Xu ly qua han" icon={<Clock className="h-3.5 w-3.5" />}>
            <div>
              <FieldLabel>Ly do tre han</FieldLabel>
              <input
                type="text"
                value={node.delayReason || ""}
                onChange={(event) => updateNode(node.id, { delayReason: event.target.value })}
                className={inputClass}
                placeholder="Nhap ly do..."
              />
            </div>
            <div>
              <FieldLabel>Han moi</FieldLabel>
              <DatePicker
                selected={node.rescheduledTime ? parseISO(node.rescheduledTime) : null}
                onChange={(date: Date | null) => updateNode(node.id, { rescheduledTime: date ? date.toISOString() : null })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="dd/MM/yyyy HH:mm"
                className={inputClass}
                placeholderText="Chon han moi"
                wrapperClassName="w-full"
                portalId="root"
                popperPlacement="bottom-end"
              />
            </div>
            <textarea
              value={node.delayNote || ""}
              onChange={(event) => updateNode(node.id, { delayNote: event.target.value })}
              className={inputClass + " min-h-[70px] resize-y"}
              placeholder="Ghi chu xu ly..."
            />
            <button
              onClick={() => {
                if (node.rescheduledTime) {
                  updateNode(node.id, {
                    dueTime: node.rescheduledTime,
                    rescheduledTime: null,
                    status: "todo",
                  });
                }
              }}
              disabled={!node.rescheduledTime}
              className="w-full rounded-lg bg-rose-600 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cap nhat han moi
            </button>
          </Section>
        )}

        <Section title="Noi dung" icon={<FileText className="h-3.5 w-3.5" />}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add descriptive notes..."
            className={inputClass + " min-h-[110px] resize-y"}
          />
        </Section>

        <Section title="Tags" icon={<Tags className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {(node.tags || []).map(tag => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{tag}</span>
            ))}
            <button className="rounded-full border border-dashed border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-slate-50">+ Add</button>
          </div>
        </Section>
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          <button
            onClick={saveTextFields}
            disabled={!hasTextChanges}
            className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            Save
          </button>
          {!isProjectNode && (
            <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100" title="Delete node" aria-label="Delete node">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-5">
              <h3 className="text-base font-bold text-slate-950">Xoa node nay?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Tat ca subtask/step con cung se bi xoa. Hanh dong nay khong the hoan tac.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200">
                Huy
              </button>
              <button onClick={handleDelete} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">
                Xoa node
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
