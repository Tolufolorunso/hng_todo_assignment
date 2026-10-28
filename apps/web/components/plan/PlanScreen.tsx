"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/types/task";
import type { FollowUp } from "@/types/followup";
import type { DailyPlan, DailyPlanItem } from "@/types/plan";
import { listTasks } from "@/lib/tasks";
import { listFollowUps } from "@/lib/followups";
import {
  createDailyPlan,
  getDailyPlanByDate,
  saveDailyPlan,
  togglePlanItemCompletion,
} from "@/lib/plans";
import { generateDailyRecommendations } from "@/lib/plan-engine";
import AvailableTimeInput from "@/components/plan/AvailableTimeInput";
import CapacitySummary from "@/components/plan/CapacitySummary";
import PlanItemCard from "@/components/plan/PlanItemCard";
import PlanBacklogDrawer from "@/components/plan/PlanBacklogDrawer";

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getShiftedDate(dateString: string, deltaDays: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return getLocalDateString(dt);
}

export default function PlanScreen() {
  const [currentDate, setCurrentDate] = useState(() => getLocalDateString());
  const [availableMinutes, setAvailableMinutes] = useState(240);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [draftItems, setDraftItems] = useState<DailyPlanItem[]>([]);
  const [isEditingAccepted, setIsEditingAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load backlog data and existing plan for selected date
  const loadData = useCallback((dateStr: string) => {
    const yesterdayStr = getShiftedDate(dateStr, -1);

    Promise.all([
      listTasks(),
      listFollowUps(),
      getDailyPlanByDate(dateStr),
      getDailyPlanByDate(yesterdayStr),
    ])
      .then(([allTasks, allFollowups, existingPlan, yesterdayPlan]) => {
        setErrorMessage(null);
        setTasks(allTasks);
        setFollowups(allFollowups);

        if (existingPlan) {
          setPlan(existingPlan);
          setAvailableMinutes(existingPlan.availableMinutes);
          setDraftItems(existingPlan.items);
          setIsEditingAccepted(false);
        } else {
          setPlan(null);
          setIsEditingAccepted(false);
          // Generate draft recommendations for the date
          const recs = generateDailyRecommendations(
            allTasks,
            allFollowups,
            240,
            { targetDate: dateStr, previousPlan: yesterdayPlan }
          );
          setDraftItems(recs.recommendedItems);
        }
      })
      .catch((err) => {
        console.error("Failed to load plan data", err);
        setErrorMessage("Failed to load plan data. Please check your connection.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData(currentDate);
  }, [currentDate, loadData]);

  // Handle changing available time in draft mode
  const handleAvailableMinutesChange = (newMins: number) => {
    setAvailableMinutes(newMins);
    if (!plan || !plan.acceptedAt || isEditingAccepted) {
      const yesterdayStr = getShiftedDate(currentDate, -1);
      getDailyPlanByDate(yesterdayStr).then((yesterdayPlan) => {
        const recs = generateDailyRecommendations(tasks, followups, newMins, {
          targetDate: currentDate,
          previousPlan: yesterdayPlan,
        });
        setDraftItems(recs.recommendedItems);
      });
    }
  };

  // Reordering helpers
  const handleMoveUp = (id: string) => {
    const idx = draftItems.findIndex((it) => it.id === id);
    if (idx <= 0) return;
    const newItems = [...draftItems];
    const temp = newItems[idx - 1];
    newItems[idx - 1] = newItems[idx];
    newItems[idx] = temp;
    newItems.forEach((it, i) => (it.order = i));
    setDraftItems(newItems);
  };

  const handleMoveDown = (id: string) => {
    const idx = draftItems.findIndex((it) => it.id === id);
    if (idx === -1 || idx >= draftItems.length - 1) return;
    const newItems = [...draftItems];
    const temp = newItems[idx + 1];
    newItems[idx + 1] = newItems[idx];
    newItems[idx] = temp;
    newItems.forEach((it, i) => (it.order = i));
    setDraftItems(newItems);
  };

  const handleRemove = (id: string) => {
    const updated = draftItems.filter((it) => it.id !== id);
    updated.forEach((it, i) => (it.order = i));
    setDraftItems(updated);
  };

  const handleUpdateEstimate = (id: string, mins: number) => {
    setDraftItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, estimatedMinutes: mins } : it))
    );
  };

  const handleAddItemFromBacklog = (item: DailyPlanItem) => {
    item.order = draftItems.length;
    setDraftItems((prev) => [...prev, item]);
    setIsBacklogOpen(false);
  };

  // Accept or save the plan
  const handleAcceptPlan = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      if (plan) {
        const updated = await saveDailyPlan({
          ...plan,
          availableMinutes,
          items: draftItems,
          acceptedAt: plan.acceptedAt || new Date().toISOString(),
        });
        setPlan(updated);
      } else {
        const created = await createDailyPlan({
          date: currentDate,
          availableMinutes,
          items: draftItems,
          acceptedAt: new Date().toISOString(),
        });
        setPlan(created);
      }
      setIsEditingAccepted(false);
    } catch (err) {
      console.error("Failed to accept plan", err);
      setErrorMessage("Failed to save daily plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle item completion in execution mode
  const handleToggleComplete = async (itemId: string) => {
    if (!plan) return;
    setErrorMessage(null);
    try {
      const updated = await togglePlanItemCompletion(plan.id, itemId);
      setPlan(updated);
      setDraftItems(updated.items);
      // Reload backlog tasks and followups in the background
      listTasks().then(setTasks);
      listFollowUps().then(setFollowups);
    } catch (err) {
      console.error("Failed to toggle item completion", err);
      setErrorMessage("Failed to update plan item status. Please try again.");
    }
  };

  const isExecutionMode = Boolean(plan && plan.acceptedAt && !isEditingAccepted);
  const plannedMinutes = draftItems.reduce((acc, it) => acc + it.estimatedMinutes, 0);
  const completedItemsCount = draftItems.filter((it) => it.completed).length;
  const currentPlanTargetIds = new Set(draftItems.map((it) => it.targetId));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-20">
      {/* Visible Error Feedback Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-medium text-danger shadow-xs"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-3 rounded-lg p-1 text-danger/80 hover:bg-danger/20 hover:text-danger"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Date Header & Stepper */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
              Plan My Day
            </h1>
            {isExecutionMode && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Active Plan
              </span>
            )}
          </div>
          <p className="pt-1 text-xs text-muted">
            {isExecutionMode
              ? "Focus on your selected commitments for today. Check them off as you complete them."
              : "Review capacity-aware recommendations, customize your shortlist, and accept today's plan."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCurrentDate(getShiftedDate(currentDate, -1))}
            aria-label="Previous day"
            className="rounded-xl border border-border bg-surface-muted/60 p-2 text-muted transition-all hover:border-border-strong hover:text-text"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <input
            type="date"
            value={currentDate}
            onChange={(e) => {
              if (e.target.value) setCurrentDate(e.target.value);
            }}
            aria-label="Selected plan date"
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />

          <button
            type="button"
            onClick={() => setCurrentDate(getShiftedDate(currentDate, 1))}
            aria-label="Next day"
            className="rounded-xl border border-border bg-surface-muted/60 p-2 text-muted transition-all hover:border-border-strong hover:text-text"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="pt-3 text-xs text-muted">Loading daily plan and backlog items...</p>
        </div>
      ) : (
        <>
          {/* Capacity and Time Controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!isExecutionMode ? (
              <AvailableTimeInput
                availableMinutes={availableMinutes}
                onChange={handleAvailableMinutesChange}
                disabled={saving}
              />
            ) : (
              <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Execution Progress
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-bold tracking-tight text-text">
                      {completedItemsCount} of {draftItems.length}
                    </span>
                    <span className="text-sm font-medium text-muted">items completed</span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingAccepted(true)}
                    className="rounded-xl border border-border bg-surface-muted/60 px-3 py-1.5 text-xs font-semibold text-text transition-all hover:border-border-strong hover:bg-surface"
                  >
                    Adjust Plan
                  </button>
                </div>
              </div>
            )}

            <CapacitySummary
              plannedMinutes={plannedMinutes}
              availableMinutes={availableMinutes}
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-base font-bold text-text">
                {isExecutionMode ? "Today's Focus List" : "Shortlist & Recommendations"}
              </h2>
              <p className="text-xs text-muted">
                {isExecutionMode
                  ? "Mark items completed as you work through your day."
                  : "Transparent selection based on deadlines, priorities, and your available time."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isExecutionMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBacklogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text shadow-xs transition-all hover:border-border-strong hover:bg-surface-muted"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add from Backlog</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving || draftItems.length === 0}
                    onClick={handleAcceptPlan}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-hover px-4 py-2 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Accept Plan"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Items List */}
          {draftItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-muted">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="pt-3 text-sm font-semibold text-text">No items in plan</h3>
              <p className="max-w-xs pt-1 text-xs text-muted">
                Your backlog is clear or items exceed available capacity. Click &quot;Add from Backlog&quot; to add work manually.
              </p>
              <button
                type="button"
                onClick={() => setIsBacklogOpen(true)}
                className="mt-4 rounded-xl bg-accent/15 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-ink transition-all"
              >
                + Add from Backlog
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {draftItems.map((item, index) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  isExecutionMode={isExecutionMode}
                  onToggleComplete={handleToggleComplete}
                  onRemove={handleRemove}
                  onUpdateEstimate={handleUpdateEstimate}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  canMoveUp={index > 0}
                  canMoveDown={index < draftItems.length - 1}
                />
              ))}
            </div>
          )}

          {/* Backlog Selection Drawer Modal */}
          <PlanBacklogDrawer
            isOpen={isBacklogOpen}
            onClose={() => setIsBacklogOpen(false)}
            tasks={tasks}
            followups={followups}
            currentPlanTargetIds={currentPlanTargetIds}
            onAddItem={handleAddItemFromBacklog}
          />
        </>
      )}
    </div>
  );
}
