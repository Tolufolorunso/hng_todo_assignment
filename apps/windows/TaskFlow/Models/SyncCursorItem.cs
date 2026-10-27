using System;

namespace TaskFlow.Models;

public class SyncCursorItem
{
    public string WorkspaceId { get; set; } = "default";
    public int Cursor { get; set; } = 0;
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("O");
}
