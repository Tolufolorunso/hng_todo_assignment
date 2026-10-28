using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using TaskFlow.ViewModels;

namespace TaskFlow.Views;

public partial class TasksView : UserControl
{
    public TasksView()
    {
        InitializeComponent();
    }

    private void OnTaskCardMouseDown(object sender, MouseButtonEventArgs e)
    {
        // Ignore clicks on buttons and checkboxes
        if (e.OriginalSource is DependencyObject dep)
        {
            var parent = dep;
            while (parent != null && parent != sender)
            {
                if (parent is Button || parent is CheckBox)
                {
                    return;
                }
                parent = System.Windows.Media.VisualTreeHelper.GetParent(parent);
            }
        }

        if (sender is FrameworkElement el && el.DataContext is TaskItemViewModel taskVm && DataContext is TasksViewModel vm)
        {
            vm.OpenEditModal(taskVm);
        }
    }

    private void OnToggleShowMoreClick(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement el && el.DataContext is TaskItemViewModel taskVm)
        {
            taskVm.ToggleExpanded();
        }
    }
}
