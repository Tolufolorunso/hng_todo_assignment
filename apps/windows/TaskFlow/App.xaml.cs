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
        var backupService = new BackupService(factory, taskRepo, noteRepo);

        var tasksVm = new TasksViewModel(taskRepo);
        var notesVm = new NotesViewModel(noteRepo);
        var backupVm = new BackupViewModel(backupService);

        var mainVm = new MainViewModel(tasksVm, notesVm, backupVm);
        var mainWindow = new MainWindow(mainVm);
        mainWindow.Show();
    }
}
