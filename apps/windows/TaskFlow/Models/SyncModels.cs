using System;
using System.Collections.Generic;

namespace TaskFlow.Models;

public class SyncState
{
    public string Status { get; set; } = "idle"; // "idle", "syncing", "offline", "error", "conflict"
    public string? LastSyncedAt { get; set; }
    public int PendingMutationsCount { get; set; }
    public int UnresolvedConflictsCount { get; set; }
    public string? ErrorMessage { get; set; }
}

public class SyncResultSummary
{
    public bool Success { get; set; }
    public int Pushed { get; set; }
    public int Pulled { get; set; }
    public int Conflicts { get; set; }
    public string? Error { get; set; }
}
