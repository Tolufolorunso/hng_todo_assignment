using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using TaskFlow.Common;
using TaskFlow.ViewModels;

namespace TaskFlow.Views;

public partial class NotesView : UserControl
{
    public NotesView()
    {
        InitializeComponent();
    }

    private void OnNoteCardMouseDown(object sender, MouseButtonEventArgs e)
    {
        // Ignore clicks originating from interactive elements like buttons
        var current = e.OriginalSource as DependencyObject;
        while (current != null && current != sender)
        {
            if (current is ButtonBase)
            {
                return;
            }
            current = VisualTreeHelper.GetParent(current);
        }

        if (sender is FrameworkElement fe && fe.DataContext is NoteItemViewModel noteVm && DataContext is NotesViewModel vm)
        {
            vm.SelectedNoteViewModel = noteVm;
        }
    }

    private void OnPrintClick(object sender, RoutedEventArgs e)
    {
        try
        {
            var printDialog = new PrintDialog();
            if (printDialog.ShowDialog() == true)
            {
                if (DataContext is NotesViewModel vm && vm.SelectedNote != null)
                {
                    var doc = HtmlFlowDocumentEngine.HtmlToFlowDocument(vm.SelectedNote.Body);
                    doc.PagePadding = new Thickness(48);
                    var paginator = ((IDocumentPaginatorSource)doc).DocumentPaginator;
                    printDialog.PrintDocument(paginator, vm.SelectedNote.Title);
                    vm.ActionableSuccessMessage = "Document sent to printer.";
                }
            }
        }
        catch (Exception ex)
        {
            if (DataContext is NotesViewModel vm)
            {
                vm.ErrorMessage = $"Print failed: {ex.Message}";
            }
        }
    }
}
