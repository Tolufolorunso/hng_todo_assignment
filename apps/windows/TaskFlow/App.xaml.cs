using System.Windows;
using TaskFlow.Data;
using TaskFlow.Repositories;
using TaskFlow.Services;
using TaskFlow.ViewModels;

namespace TaskFlow;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var factory = new DatabaseConnectionFactory();
        using (var connection = factory.CreateConnection())
        {
            connection.Open();
            var runner = new MigrationRunner(factory);
            runner.RunMigrations(connection);
        }

        var syncRepo = new SyncRepository(factory);
        var taskRepo = new TaskRepository(factory, syncRepo);
        var noteRepo = new NoteRepository(factory, syncRepo);
        var followUpRepo = new FollowUpRepository(factory, syncRepo);
        var dailyPlanRepo = new DailyPlanRepository(factory, syncRepo);
        var inboxRepo = new InboxRepository(factory, syncRepo);
        var taskOrderRepo = new TaskOrderRepository(factory, syncRepo);

        var sessionStore = new DpapiSessionStore();
        var authService = new AuthService(sessionStore);
        var syncEngine = new SyncEngine(factory, syncRepo, authService);
        var adoptionService = new AdoptionService(factory, syncRepo, taskRepo, noteRepo, followUpRepo, dailyPlanRepo, inboxRepo, taskOrderRepo);
        var conflictService = new ConflictService(factory, syncRepo);
        var networkRecoveryService = new NetworkRecoveryService(syncEngine, followUpRepo);
        networkRecoveryService.Start();

        var accountVm = new AccountViewModel(authService, adoptionService, syncEngine);
        var conflictVm = new ConflictViewModel(conflictService);

        var launcherService = new LauncherService();
        var triageService = new InboxTriageService(inboxRepo, taskRepo, noteRepo, followUpRepo);
        var actionableNotesService = new ActionableNotesService(taskRepo, followUpRepo, noteRepo);
        var backupService = new BackupService(factory, taskRepo, noteRepo);

        var tasksVm = new TasksViewModel(taskRepo);
        var notesVm = new NotesViewModel(noteRepo, actionableNotesService);
        var backupVm = new BackupViewModel(backupService);
        var followUpsVm = new FollowUpsViewModel(followUpRepo, launcherService);
        var planMyDayVm = new PlanMyDayViewModel(dailyPlanRepo, taskRepo, followUpRepo);
        var inboxVm = new InboxViewModel(inboxRepo, triageService);
        var calendarVm = new CalendarViewModel(taskRepo, followUpRepo);
        var analyticsVm = new AnalyticsViewModel(taskRepo, noteRepo, followUpRepo, inboxRepo);
        var themeVm = new ThemeViewModel();

        var mainVm = new MainViewModel(
            tasksVm,
            notesVm,
            backupVm,
            followUpsVm,
            planMyDayVm,
            inboxVm,
            calendarVm,
            analyticsVm,
            themeVm,
            accountVm,
            conflictVm,
            syncEngine);

        var mainWindow = new MainWindow(mainVm, networkRecoveryService);
        mainWindow.Show();
    }
}
