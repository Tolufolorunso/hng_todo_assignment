using System.Windows;
using System.Windows.Input;
using TaskFlow.ViewModels;

namespace TaskFlow;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    public MainWindow(MainViewModel viewModel) : this()
    {
        DataContext = viewModel;
        Loaded += async (_, _) =>
        {
            await viewModel.InitializeAsync();
        };
    }

    protected override void OnPreviewKeyDown(KeyEventArgs e)
    {
        base.OnPreviewKeyDown(e);

        if (e.Key == Key.F && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
        {
            SearchInput.Focus();
            SearchInput.SelectAll();
            e.Handled = true;
        }
    }
}