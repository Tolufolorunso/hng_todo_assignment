using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using Xunit;

namespace TaskFlow.Tests;

public class DailyPlanRepositoryTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly DailyPlanRepository _planRepository;
    private readonly TaskOrderRepository _orderRepository;

    public DailyPlanRepositoryTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _planRepository = new DailyPlanRepository(_factory);
        _orderRepository = new TaskOrderRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task SaveAsync_And_GetByDateAsync_StoresAndRetrievesPlan()
    {
        var plan = new DailyPlanItem
        {
            LocalDate = "2026-10-30",
            TimeZone = "America/New_York",
            AvailableMinutes = 300,
            Items = new List<PlanItemReference>
            {
                new PlanItemReference
                {
                    Type = "task",
                    Id = "t1",
                    Title = "Build Plan My Day UI",
                    EstimatedMinutes = 60,
                    Explanation = "High priority task",
                    Score = 700
                }
            }
        };

        var saved = await _planRepository.SaveAsync(plan);
        Assert.NotNull(saved.Id);
        Assert.Equal("2026-10-30", saved.LocalDate);

        var retrieved = await _planRepository.GetByDateAsync("2026-10-30");
        Assert.NotNull(retrieved);
        Assert.Equal(300, retrieved.AvailableMinutes);
        Assert.Single(retrieved.Items);
        Assert.Equal("Build Plan My Day UI", retrieved.Items[0].Title);
        Assert.Null(retrieved.AcceptedAt);
    }

    [Fact]
    public async Task AcceptAsync_SetsAcceptedTimestamp()
    {
        var plan = new DailyPlanItem
        {
            LocalDate = "2026-10-31",
            AvailableMinutes = 240,
            Items = new List<PlanItemReference>()
        };
        await _planRepository.SaveAsync(plan);

        var accepted = await _planRepository.AcceptAsync("2026-10-31");
        Assert.NotNull(accepted.AcceptedAt);

        var retrieved = await _planRepository.GetByDateAsync("2026-10-31");
        Assert.NotNull(retrieved);
        Assert.NotNull(retrieved.AcceptedAt);
    }

    [Fact]
    public async Task ListRecentAsync_ReturnsPlansInDescendingDateOrder()
    {
        await _planRepository.SaveAsync(new DailyPlanItem { LocalDate = "2026-10-20" });
        await _planRepository.SaveAsync(new DailyPlanItem { LocalDate = "2026-10-25" });
        await _planRepository.SaveAsync(new DailyPlanItem { LocalDate = "2026-10-22" });

        var list = await _planRepository.ListRecentAsync(10);
        Assert.Equal(3, list.Count);
        Assert.Equal("2026-10-25", list[0].LocalDate);
        Assert.Equal("2026-10-22", list[1].LocalDate);
        Assert.Equal("2026-10-20", list[2].LocalDate);
    }

    [Fact]
    public async Task TaskOrderRepository_SavesAndRetrievesOrder()
    {
        var emptyOrder = await _orderRepository.GetOrderAsync("default");
        Assert.Empty(emptyOrder);

        var orderedIds = new List<string> { "task-3", "task-1", "task-2" };
        await _orderRepository.SaveOrderAsync("default", orderedIds);

        var retrieved = await _orderRepository.GetOrderAsync("default");
        Assert.Equal(3, retrieved.Count);
        Assert.Equal("task-3", retrieved[0]);
        Assert.Equal("task-1", retrieved[1]);
        Assert.Equal("task-2", retrieved[2]);
    }
}
