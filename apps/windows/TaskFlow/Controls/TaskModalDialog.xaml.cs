using System.Windows.Controls;
using System.Windows.Input;
using TaskFlow.ViewModels;

namespace TaskFlow.Controls;

public partial class TaskModalDialog : UserControl
{
    public TaskModalDialog()
    {
        InitializeComponent();
    }

    private void OnBackdropMouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.OriginalSource == sender && DataContext is TasksViewModel vm)
        {
            vm.CloseModalCommand.Execute(null);
        }
    }

    private void OnDialogCardMouseDown(object sender, MouseButtonEventArgs e)
    {
        e.Handled = true;
    }
}

