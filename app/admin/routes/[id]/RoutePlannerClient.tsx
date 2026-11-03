"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import StopList, { type Assignment, type StudentOption } from "./StopList";
import type { StopPoint } from "./RouteMap";
import { addStopAction, deleteStopAction, reorderStopsAction, assignStudentAction, unassignStudentAction } from "../actions";

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

export default function RoutePlannerClient({
  routeId,
  stops: initialStops,
  assignments: initialAssignments,
  allStudents,
}: {
  routeId: string;
  stops: StopPoint[];
  assignments: Assignment[];
  allStudents: StudentOption[];
}) {
  const [stops, setStops] = useState(initialStops);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [, startTransition] = useTransition();

  function handleAddStop(lat: number, lng: number) {
    const name = window.prompt("Stop name?");
    if (!name) return;
    const tempId = `temp-${Date.now()}`;
    setStops((prev) => [...prev, { id: tempId, name, lat, lng, seq: prev.length }]);
    startTransition(async () => {
      const created = await addStopAction(routeId, name, lat, lng);
      setStops((prev) => prev.map((s) => (s.id === tempId ? { ...created, lat, lng } : s)));
    });
  }

  function handleDeleteStop(stopId: string) {
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    setAssignments((prev) => prev.filter((a) => a.stopId !== stopId));
    startTransition(() => deleteStopAction(routeId, stopId));
  }

  function handleReorder(orderedIds: string[]) {
    const byId = new Map(stops.map((s) => [s.id, s]));
    setStops(orderedIds.map((id, i) => ({ ...byId.get(id)!, seq: i })));
    startTransition(() => reorderStopsAction(routeId, orderedIds));
  }

  function handleAssign(studentId: string, stopId: string) {
    const student = allStudents.find((st) => st.id === studentId)!;
    setAssignments((prev) => [
      ...prev.filter((a) => a.studentId !== studentId),
      { studentId, stopId, studentName: student.name, classSection: student.classSection },
    ]);
    startTransition(() => assignStudentAction(routeId, studentId, stopId));
  }

  function handleUnassign(studentId: string) {
    setAssignments((prev) => prev.filter((a) => a.studentId !== studentId));
    startTransition(() => unassignStudentAction(routeId, studentId));
  }

  return (
    <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 min-h-0">
      <div className="border border-[var(--color-blue-3)]">
        <RouteMap stops={stops} onAddStop={handleAddStop} onDeleteStop={handleDeleteStop} />
      </div>
      <StopList
        routeId={routeId}
        stops={stops}
        assignments={assignments}
        allStudents={allStudents}
        onReorder={handleReorder}
        onDeleteStop={handleDeleteStop}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
      />
    </div>
  );
}
