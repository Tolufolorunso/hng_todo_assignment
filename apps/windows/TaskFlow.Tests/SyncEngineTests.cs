using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class SyncEngineTests : IDisposable
{
    private readonly SqliteConnection _keepAliveConnection;
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository _syncRepo;
    private readonly TaskRepository _taskRepo;

    public SyncEngineTests()
    {
        _connectionFactory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _connectionFactory.CreateConnection();
        _keepAliveConnection.Open();
        new MigrationRunner(_connectionFactory).RunMigrations(_keepAliveConnection);

        _syncRepo = new SyncRepository(_connectionFactory);
        _taskRepo = new TaskRepository(_connectionFactory, _syncRepo);
    }

    public void Dispose()
    {
        _keepAliveConnection.Close();
        _keepAliveConnection.Dispose();
    }

    private class MockAuthService : IAuthService
    {
        public bool IsAuthenticated => CurrentSession != null;
        public SessionCredentials? CurrentSession { get; set; } = new()
        {
            AccessToken = "test-token",
            RefreshToken = "test-refresh",
            UserId = "user-1",
            Email = "test@example.com",
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        public event Action<bool>? AuthStateChanged;

        public Task InitializeAsync() => Task.CompletedTask;
        public Task<bool> RequestOtpAsync(string email) => Task.FromResult(true);
        public Task<SessionCredentials> VerifyOtpAsync(string email, string code) => Task.FromResult(CurrentSession!);
        public Task<SessionCredentials?> RefreshSessionAsync() => Task.FromResult(CurrentSession);
        public Task LogoutAsync() { CurrentSession = null; AuthStateChanged?.Invoke(false); return Task.CompletedTask; }
        public Task<IReadOnlyList<ActiveSessionItem>> ListSessionsAsync() => Task.FromResult<IReadOnlyList<ActiveSessionItem>>(Array.Empty<ActiveSessionItem>());
        public Task RevokeSessionAsync(string sessionId) => Task.CompletedTask;
        public Task<AccountProfile?> GetAccountProfileAsync() => Task.FromResult<AccountProfile?>(null);
        public Task<bool> DeleteAccountAsync() => Task.FromResult(true);
    }

    private class MockHttpHandler : HttpMessageHandler
    {
        public Func<HttpRequestMessage, HttpResponseMessage> Handler { get; set; } = _ => new HttpResponseMessage(HttpStatusCode.OK);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(Handler(request));
        }
    }

    [Fact]
    public async Task SyncOnceAsync_WhenNotAuthenticated_ReturnsWithoutSyncing()
    {
        var mockAuth = new MockAuthService { CurrentSession = null };
        var mockHandler = new MockHttpHandler();
        var httpClient = new HttpClient(mockHandler);

        var engine = new SyncEngine(_connectionFactory, _syncRepo, mockAuth, httpClient, "http://localhost:3000");
        var result = await engine.SyncOnceAsync();

        Assert.False(result.Success);
        Assert.Equal("Unauthenticated.", result.Error);
        Assert.Equal(0, result.Pushed);
        Assert.Equal(0, result.Pulled);
    }

    [Fact]
    public async Task SyncOnceAsync_PushesOutboxMutations_AndAppliesReceipts()
    {
        var mockAuth = new MockAuthService();
        var mockHandler = new MockHttpHandler();

        // Enqueue a local task which also enqueues an outbox mutation
        var createdTask = await _taskRepo.CreateAsync(new TaskItem
        {
            Title = "Test Task",
            Priority = "high"
        });
        var pendingMutations = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Single(pendingMutations);
        string mutationId = pendingMutations[0].MutationId;

        string receivedRequestBody = string.Empty;
        mockHandler.Handler = req =>
        {
            receivedRequestBody = req.Content?.ReadAsStringAsync().Result ?? string.Empty;
            string responseJson = $@"{{
                ""success"": true,
                ""data"": {{
                    ""receipts"": [
                        {{
                            ""mutationId"": ""{mutationId}"",
                            ""entityType"": ""task"",
                            ""entityId"": ""{createdTask.Id}"",
                            ""status"": ""applied"",
                            ""appliedRevision"": 7
                        }}
                    ],
                    ""changes"": {{}},
                    ""nextCursor"": 7,
                    ""hasMore"": false
                }}
            }}";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            };
        };

        var httpClient = new HttpClient(mockHandler);
        var engine = new SyncEngine(_connectionFactory, _syncRepo, mockAuth, httpClient, "http://localhost:3000");

        var result = await engine.SyncOnceAsync();

        Assert.True(result.Success);
        Assert.Equal(1, result.Pushed);
        Assert.Contains(mutationId, receivedRequestBody);

        // Verify outbox was dequeued
        var remainingMutations = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Empty(remainingMutations);

        // Verify server revision was saved
        int? rev = await _syncRepo.GetServerRevisionAsync("task", createdTask.Id);
        Assert.Equal(7, rev);

        // Verify cursor was updated
        int cursor = await _syncRepo.GetCursorAsync();
        Assert.Equal(7, cursor);
    }

    [Fact]
    public async Task SyncOnceAsync_HandlesConflictReceipt()
    {
        var mockAuth = new MockAuthService();
        var mockHandler = new MockHttpHandler();

        var createdTask = await _taskRepo.CreateAsync(new TaskItem { Title = "Conflicted Task" });
        var pending = await _syncRepo.PeekOutboxBatchAsync(10);
        string mutationId = pending[0].MutationId;

        mockHandler.Handler = req =>
        {
            string responseJson = $@"{{
                ""success"": true,
                ""data"": {{
                    ""receipts"": [
                        {{
                            ""mutationId"": ""{mutationId}"",
                            ""entityType"": ""task"",
                            ""entityId"": ""{createdTask.Id}"",
                            ""status"": ""conflict"",
                            ""conflictDetails"": {{
                                ""serverRevision"": 15,
                                ""currentServerEntity"": {{
                                    ""id"": ""{createdTask.Id}"",
                                    ""title"": ""Server Conflicted Title""
                                }}
                            }}
                        }}
                    ],
                    ""changes"": {{}},
                    ""nextCursor"": 15,
                    ""hasMore"": false
                }}
            }}";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            };
        };

        var httpClient = new HttpClient(mockHandler);
        var engine = new SyncEngine(_connectionFactory, _syncRepo, mockAuth, httpClient, "http://localhost:3000");

        var result = await engine.SyncOnceAsync();

        Assert.True(result.Success);
        Assert.Equal("conflict", engine.State.Status);
        Assert.Equal(1, engine.State.UnresolvedConflictsCount);

        // Verify conflict saved in database
        var conflicts = await _syncRepo.GetConflictsAsync();
        Assert.Single(conflicts);
        Assert.Equal(createdTask.Id, conflicts[0].EntityId);
        Assert.Equal(15, conflicts[0].ServerRevision);

        // Verify outbox was dequeued so it does not loop
        var remaining = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task SyncOnceAsync_PullsServerChanges_AndAppliesToLocalDatabase()
    {
        var mockAuth = new MockAuthService();
        var mockHandler = new MockHttpHandler();

        mockHandler.Handler = req =>
        {
            string responseJson = @"{
                ""success"": true,
                ""data"": {
                    ""receipts"": [],
                    ""changes"": {
                        ""tasks"": [
                            {
                                ""id"": ""server-task-100"",
                                ""title"": ""Task from Web Client"",
                                ""description"": ""Sync pulled task"",
                                ""completed"": false,
                                ""priority"": ""high"",
                                ""createdAt"": ""2026-10-27T08:00:00Z"",
                                ""updatedAt"": ""2026-10-27T08:00:00Z""
                            }
                        ]
                    },
                    ""nextCursor"": 42,
                    ""hasMore"": false
                }
            }";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            };
        };

        var httpClient = new HttpClient(mockHandler);
        var engine = new SyncEngine(_connectionFactory, _syncRepo, mockAuth, httpClient, "http://localhost:3000");

        var result = await engine.SyncOnceAsync();

        Assert.True(result.Success);
        Assert.Equal(1, result.Pulled);

        // Verify task exists in local repo
        var pulledTask = await _taskRepo.GetByIdAsync("server-task-100");
        Assert.NotNull(pulledTask);
        Assert.Equal("Task from Web Client", pulledTask.Title);
        Assert.Equal("high", pulledTask.Priority);

        // Verify that applying server change did NOT create an outbox entry
        var outbox = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Empty(outbox);

        // Verify cursor
        int cursor = await _syncRepo.GetCursorAsync();
        Assert.Equal(42, cursor);
    }

    [Fact]
    public async Task SyncOnceAsync_HandlesPagination()
    {
        var mockAuth = new MockAuthService();
        var mockHandler = new MockHttpHandler();
        int requestCount = 0;

        mockHandler.Handler = req =>
        {
            requestCount++;
            if (requestCount == 1)
            {
                string page1 = @"{
                    ""success"": true,
                    ""data"": {
                        ""receipts"": [],
                        ""changes"": {
                            ""tasks"": [
                                {
                                    ""id"": ""paged-task-1"",
                                    ""title"": ""Page 1 Task"",
                                    ""completed"": false,
                                    ""priority"": ""medium"",
                                    ""createdAt"": ""2026-10-27T08:00:00Z"",
                                    ""updatedAt"": ""2026-10-27T08:00:00Z""
                                }
                            ]
                        },
                        ""nextCursor"": 10,
                        ""hasMore"": true
                    }
                }";
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(page1, Encoding.UTF8, "application/json")
                };
            }
            else
            {
                string page2 = @"{
                    ""success"": true,
                    ""data"": {
                        ""receipts"": [],
                        ""changes"": {
                            ""tasks"": [
                                {
                                    ""id"": ""paged-task-2"",
                                    ""title"": ""Page 2 Task"",
                                    ""completed"": false,
                                    ""priority"": ""low"",
                                    ""createdAt"": ""2026-10-27T08:00:00Z"",
                                    ""updatedAt"": ""2026-10-27T08:00:00Z""
                                }
                            ]
                        },
                        ""nextCursor"": 20,
                        ""hasMore"": false
                    }
                }";
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(page2, Encoding.UTF8, "application/json")
                };
            }
        };

        var httpClient = new HttpClient(mockHandler);
        var engine = new SyncEngine(_connectionFactory, _syncRepo, mockAuth, httpClient, "http://localhost:3000");

        var result = await engine.SyncOnceAsync();

        Assert.True(result.Success);
        Assert.Equal(2, result.Pulled);
        Assert.Equal(2, requestCount);

        int cursor = await _syncRepo.GetCursorAsync();
        Assert.Equal(20, cursor);
    }

    [Fact]
    public async Task SyncOnceAsync_WhenNetworkFails_TransitionsToOffline()
    {
        var mockAuth = new MockAuthService();
        var mockHandler = new MockHttpHandler();

        mockHandler.Handler = _ => throw new HttpRequestException("Network error");

        var httpClient = new HttpClient(mockHandler);
        var engine = new SyncEngine(_connectionFactory, _syncRepo, mockAuth, httpClient, "http://localhost:3000");

        var result = await engine.SyncOnceAsync();

        Assert.False(result.Success);
        Assert.Equal("offline", engine.State.Status);
    }
}
