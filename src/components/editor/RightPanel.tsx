import { useState, useEffect } from "react";
import { parseISO } from "date-fns";
import { X, Trash2, Clock } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { useStore } from "../../store/useStore";
import { getComputedStatus } from "../../utils";

export default function RightPanel() {
  const { nodes, selectedNodeId, setSelectedNode, updateNode, deleteNode } = useStore();
  const node = nodes.find(n => n.id === selectedNodeId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
    }
  }, [node?.id, node?.title, node?.content]);

  if (!node) return null;

  const saveTextFields = () => {
    if (title !== node.title || content !== node.content) {
      updateNode(node.id, { title, content });
    }
  };

  const handleDelete = () => {
    if (confirm("Bạn có chắc muốn xóa node này? Toàn bộ subtask/step con cũng sẽ bị xóa.")) {
      deleteNode(node.id);
      toast.success("Đã xóa node");
    }
  };

  const status = getComputedStatus(node);
  const isProjectNode = node.type === "project";

  return (
    <div className="w-64 bg-white border-l border-slate-200 shrink-0 p-4 flex flex-col h-full z-30">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-bold text-slate-800 uppercase">Node Editor</h2>
        <button onClick={() => setSelectedNode(null)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Đóng">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Title</label>
          <input
            type="text"
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTextFields}
            placeholder="Node title"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label>
            <span className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md block capitalize text-slate-600 font-medium">{node.type}</span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Status</label>
            <select
              value={node.status}
              onChange={(event) => updateNode(node.id, { status: event.target.value as any })}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:border-indigo-500 capitalize"
            >
              <option value="todo">To Do</option>
              <option value="doing">Doing</option>
              <option value="paused">Paused</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Priority</label>
          <select
            value={node.priority}
            onChange={(event) => updateNode(node.id, { priority: event.target.value as any })}
            className="w-full text-xs p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 font-bold focus:outline-none focus:border-amber-400 capitalize"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Start Time</label>
              {node.startTime && (
                <button onClick={() => updateNode(node.id, { startTime: null })} className="text-[9px] text-slate-400 hover:text-slate-600">Clear</button>
              )}
            </div>
            <DatePicker
              selected={node.startTime ? parseISO(node.startTime) : null}
              onChange={(date: Date | null) => updateNode(node.id, { startTime: date ? date.toISOString() : null })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="dd/MM/yyyy HH:mm"
              className="w-full text-xs bg-slate-50 p-2 border border-slate-200 rounded text-slate-600 font-medium focus:outline-none focus:border-indigo-500"
              placeholderText="Chọn thời gian bắt đầu"
              wrapperClassName="w-full"
              portalId="root"
              popperPlacement="bottom-end"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Due Time</label>
              {node.dueTime && (
                <button onClick={() => updateNode(node.id, { dueTime: null })} className="text-[9px] text-slate-400 hover:text-slate-600">Clear</button>
              )}
            </div>
            <DatePicker
              selected={node.dueTime ? parseISO(node.dueTime) : null}
              onChange={(date: Date | null) => updateNode(node.id, { dueTime: date ? date.toISOString() : null })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="dd/MM/yyyy HH:mm"
              className="w-full text-xs bg-slate-50 p-2 border border-slate-200 rounded text-slate-600 font-medium focus:outline-none focus:border-indigo-500"
              placeholderText="Chọn hạn hoàn thành"
              wrapperClassName="w-full"
              portalId="root"
              popperPlacement="bottom-end"
            />
          </div>
        </div>

        {status === "overdue" && (
          <div className="bg-rose-50 border border-rose-200 rounded-md p-3 space-y-3 mt-4">
            <h3 className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Công việc đã quá hạn
            </h3>

            <div>
              <label className="text-[10px] font-bold text-rose-600 block mb-1">Lý do trễ hạn</label>
              <input
                type="text"
                value={node.delayReason || ""}
                onChange={(event) => updateNode(node.id, { delayReason: event.target.value })}
                className="w-full text-xs p-2 bg-white border border-rose-200 rounded-md text-slate-700 focus:outline-none focus:border-rose-400"
                placeholder="Nhập lý do..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-rose-600 block mb-1">Thời gian hoàn thành lại</label>
              <DatePicker
                selected={node.rescheduledTime ? parseISO(node.rescheduledTime) : null}
                onChange={(date: Date | null) => updateNode(node.id, { rescheduledTime: date ? date.toISOString() : null })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="dd/MM/yyyy HH:mm"
                className="w-full text-xs bg-white p-2 border border-rose-200 rounded-md text-slate-700 focus:outline-none focus:border-rose-400"
                placeholderText="Chọn hạn mới"
                wrapperClassName="w-full"
                portalId="root"
                popperPlacement="bottom-end"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-rose-600 block mb-1">Ghi chú xử lý</label>
              <textarea
                value={node.delayNote || ""}
                onChange={(event) => updateNode(node.id, { delayNote: event.target.value })}
                className="w-full text-xs p-2 bg-white border border-rose-200 rounded-md text-slate-700 min-h-[60px] resize-y focus:outline-none focus:border-rose-400"
                placeholder="Nhập ghi chú..."
              />
            </div>

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
              className="w-full py-1.5 text-xs font-bold text-white bg-rose-600 rounded-md shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              Cập nhật hạn mới
            </button>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notes</label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onBlur={saveTextFields}
            placeholder="Add descriptive notes..."
            className="w-full text-xs border border-slate-200 bg-slate-50 rounded-md p-2 min-h-[80px] resize-y focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-700"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tags</label>
          <div className="flex flex-wrap gap-1">
            {node.tags.map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">{tag}</span>
            ))}
            <button className="text-[9px] px-2 py-0.5 border border-dashed border-slate-300 text-slate-400 rounded-full hover:bg-slate-50 transition-colors">+ Add</button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex gap-2 shrink-0 mt-2">
        <button onClick={saveTextFields} className="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition-colors">Save</button>
        {!isProjectNode && (
          <button onClick={handleDelete} className="p-1.5 text-rose-500 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
