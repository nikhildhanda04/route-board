"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StopPoint } from "./RouteMap";

export type Assignment = { studentId: string; stopId: string; studentName: string; classSection: string | null };
export type StudentOption = { id: string; name: string; classSection: string | null };

export default function StopList({
  routeId,
  stops,
  assignments,
  allStudents,
  onReorder,
  onDeleteStop,
  onAssign,
  onUnassign,
}: {
  routeId: string;
  stops: StopPoint[];
  assignments: Assignment[];
  allStudents: StudentOption[];
  onReorder: (orderedIds: string[]) => void;
  onDeleteStop: (stopId: string) => void;
  onAssign: (studentId: string, stopId: string) => void;
  onUnassign: (studentId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const assignedIds = new Set(assignments.map((a) => a.studentId));
  const unassigned = allStudents.filter((st) => !assignedIds.has(st.id));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(stops, oldIndex, newIndex).map((s) => s.id));
  }

  return (
    <div className="overflow-y-auto h-full pr-1">
      {/* A stable id avoids dnd-kit's default auto-incrementing id, which
          mismatches between server and client render on every navigation. */}
      <DndContext id={`route-${routeId}-stops`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {stops.map((stop, i) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={i}
                students={assignments.filter((a) => a.stopId === stop.id)}
                unassigned={unassigned}
                onDelete={() => onDeleteStop(stop.id)}
                onAssign={(studentId) => onAssign(studentId, stop.id)}
                onUnassign={onUnassign}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {stops.length === 0 && (
        <p className="text-sm text-[var(--color-pencil)] py-10 text-center">Click the map to drop your first stop.</p>
      )}
    </div>
  );
}

function StopCard({
  stop, index, students, unassigned, onDelete, onAssign, onUnassign,
}: {
  stop: StopPoint; index: number; students: Assignment[]; unassigned: StudentOption[];
  onDelete: () => void; onAssign: (studentId: string) => void; onUnassign: (studentId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="border border-[var(--color-blue-3)] bg-sheet p-3">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-[var(--color-pencil)] px-1" aria-label="Drag to reorder">
          ⠿
        </button>
        <span className="typed text-xs text-[var(--color-blue)] w-5">{index + 1}</span>
        <span className="font-medium text-sm flex-1">{stop.name}</span>
        <button onClick={onDelete} className="text-xs text-[var(--color-pencil)] hover:text-[var(--color-red)]">Remove</button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
        {students.map((a) => (
          <span key={a.studentId} className="inline-flex items-center gap-1 bg-[var(--color-wall)] border border-[var(--color-blue-3)] px-2 py-0.5 text-xs">
            {a.studentName}
            <button onClick={() => onUnassign(a.studentId)} className="text-[var(--color-pencil)] hover:text-[var(--color-red)]">×</button>
          </span>
        ))}
        {students.length === 0 && <span className="text-xs text-[var(--color-pencil)]">No students assigned</span>}
      </div>

      {unassigned.length > 0 && (
        <select
          onChange={(e) => { if (e.target.value) { onAssign(e.target.value); e.target.value = ""; } }}
          className="ml-9 mt-2 text-xs border border-[var(--color-blue-3)] px-2 py-1"
          defaultValue=""
        >
          <option value="" disabled>+ Assign student…</option>
          {unassigned.map((st) => (
            <option key={st.id} value={st.id}>{st.name}{st.classSection ? ` (${st.classSection})` : ""}</option>
          ))}
        </select>
      )}
    </div>
  );
}
