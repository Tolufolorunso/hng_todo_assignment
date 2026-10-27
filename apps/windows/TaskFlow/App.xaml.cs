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

        var taskRepo = new TaskRepository(factory);
        var noteRepo = new NoteRepository(factory);
        var followUpRepo = new FollowUpRepository(factory);
        var dailyPlanRepo = new DailyPlanRepository(factory);
        var inboxRepo = new InboxRepository(factory);
        var taskOrderRepo = new TaskOrderRepository(factory);

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
            themeVm);

        var mainWindow = new MainWindow(mainVm);
        mainWindow.Show();
    }
}
