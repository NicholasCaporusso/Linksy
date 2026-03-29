using System.Runtime.InteropServices;

namespace Linksy.FocusHelper;

internal static class Program
{
    [DllImport("user32.dll")]
    private static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [STAThread]
    private static void Main(string[] args)
    {
        if (args.Length == 0)
        {
            return;
        }

        var targetPath = args[0];
        Thread.Sleep(300);

        var shellType = Type.GetTypeFromProgID("Shell.Application");
        if (shellType == null)
        {
            return;
        }

        dynamic? shell = Activator.CreateInstance(shellType);
        if (shell == null)
        {
            return;
        }

        try
        {
            foreach (var window in shell.Windows())
            {
                try
                {
                    var path = (string?)window?.Document?.Folder?.Self?.Path ?? "";
                    var parent = Path.GetDirectoryName(targetPath) ?? "";
                    if (string.Equals(path.TrimEnd('\\'), targetPath.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(path.TrimEnd('\\'), parent.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
                    {
                        var hwnd = new IntPtr((int)window.HWND);
                        ShowWindowAsync(hwnd, 9);
                        SetForegroundWindow(hwnd);
                        break;
                    }
                }
                catch
                {
                }
            }
        }
        finally
        {
            if (Marshal.IsComObject(shell))
            {
                Marshal.FinalReleaseComObject(shell);
            }
        }
    }
}
