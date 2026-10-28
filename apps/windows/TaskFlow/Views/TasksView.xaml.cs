using System;
using System.Windows;
using System.Windows.Controls;

namespace TaskFlow.Views;

public partial class TasksView : UserControl
{
    public TasksView()
    {
        InitializeComponent();
    }

    private void OnFormatTextClick(object sender, RoutedEventArgs e)
    {
        if (sender is not FrameworkElement element) return;
        string action = element.Tag?.ToString() ?? string.Empty;
        string targetName = (element as Button)?.CommandParameter?.ToString()
            ?? element.Tag?.ToString()
            ?? string.Empty;

        if (string.IsNullOrEmpty(action) || string.IsNullOrEmpty(targetName)) return;

        if (FindName(targetName) is TextBox targetTextBox)
        {
            var (newText, newStart, newLength) = Common.TextFormattingHelper.ApplyFormat(
                targetTextBox.Text,
                targetTextBox.SelectionStart,
                targetTextBox.SelectionLength,
                action);

            targetTextBox.Text = newText;
            targetTextBox.Focus();
            targetTextBox.Select(newStart, newLength);
        }
    }
}

