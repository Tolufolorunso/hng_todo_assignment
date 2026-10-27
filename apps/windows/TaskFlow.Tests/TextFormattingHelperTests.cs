using TaskFlow.Common;
using Xunit;

namespace TaskFlow.Tests;

public class TextFormattingHelperTests
{
    [Fact]
    public void ApplyFormat_Bold_WithSelection_WrapsSelectedText()
    {
        string text = "Hello world";
        int start = 6;
        int length = 5; // "world"

        var (newText, newStart, newLength) = TextFormattingHelper.ApplyFormat(text, start, length, "bold");

        Assert.Equal("Hello **world**", newText);
        Assert.Equal(8, newStart);
        Assert.Equal(5, newLength);
    }

    [Fact]
    public void ApplyFormat_Bold_EmptySelection_InsertsPlaceholder()
    {
        string text = "Note: ";
        int start = 6;
        int length = 0;

        var (newText, newStart, newLength) = TextFormattingHelper.ApplyFormat(text, start, length, "bold");

        Assert.Equal("Note: **bold text**", newText);
        Assert.Equal(8, newStart);
        Assert.Equal(9, newLength);
    }

    [Fact]
    public void ApplyFormat_Italic_WrapsText()
    {
        string text = "important item";
        var (newText, newStart, newLength) = TextFormattingHelper.ApplyFormat(text, 0, 9, "italic");

        Assert.Equal("*important* item", newText);
        Assert.Equal(1, newStart);
        Assert.Equal(9, newLength);
    }

    [Fact]
    public void ApplyFormat_Strikethrough_WrapsText()
    {
        string text = "deprecated task";
        var (newText, newStart, newLength) = TextFormattingHelper.ApplyFormat(text, 0, 10, "strikethrough");

        Assert.Equal("~~deprecated~~ task", newText);
        Assert.Equal(2, newStart);
        Assert.Equal(10, newLength);
    }

    [Fact]
    public void ApplyFormat_Code_WrapsText()
    {
        string text = "run verify";
        var (newText, newStart, newLength) = TextFormattingHelper.ApplyFormat(text, 4, 6, "code");

        Assert.Equal("run `verify`", newText);
        Assert.Equal(5, newStart);
        Assert.Equal(6, newLength);
    }

    [Fact]
    public void ApplyFormat_Headings_PrefixesLine()
    {
        string text = "Overview section";

        var (h1Text, _, _) = TextFormattingHelper.ApplyFormat(text, 0, 8, "h1");
        Assert.Equal("# Overview section", h1Text);

        var (h2Text, _, _) = TextFormattingHelper.ApplyFormat(text, 0, 8, "h2");
        Assert.Equal("## Overview section", h2Text);
    }

    [Fact]
    public void ApplyFormat_ListsAndQuote_PrefixesLine()
    {
        string text = "First item";

        var (bulletText, _, _) = TextFormattingHelper.ApplyFormat(text, 0, 5, "bullet");
        Assert.Equal("- First item", bulletText);

        var (numberedText, _, _) = TextFormattingHelper.ApplyFormat(text, 0, 5, "numbered");
        Assert.Equal("1. First item", numberedText);

        var (quoteText, _, _) = TextFormattingHelper.ApplyFormat(text, 0, 5, "quote");
        Assert.Equal("> First item", quoteText);
    }

    [Fact]
    public void ApplyFormat_NullOrOutOfBounds_SafelyHandled()
    {
        var (nullRes, start1, len1) = TextFormattingHelper.ApplyFormat(null, 5, 10, "bold");
        Assert.Equal("**bold text**", nullRes);

        var (outOfBoundsRes, start2, len2) = TextFormattingHelper.ApplyFormat("Short", 50, 10, "italic");
        Assert.Equal("Short*italic text*", outOfBoundsRes);
    }
}
