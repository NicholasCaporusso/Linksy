using System.Diagnostics;
using System.Windows.Forms;
using Linksy.NativeCommon;

namespace Linksy.Uninstaller;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var installDirectory = LinksyInstallInfo.InstallDirectory;
        if (MessageBox.Show(
                $"Remove Linksy from:{Environment.NewLine}{installDirectory}",
                "Linksy Uninstaller",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning) != DialogResult.Yes)
        {
            return;
        }

        LinksyInstallInfo.RemoveContextMenu();
        LinksyInstallInfo.RemoveUninstallRegistration();
        LinksyInstallInfo.RemoveShortcutArtifacts();

        foreach (var process in Process.GetProcessesByName("linksy"))
        {
            try
            {
                if (string.Equals(process.MainModule?.FileName, LinksyInstallInfo.ExecutablePath, StringComparison.OrdinalIgnoreCase))
                {
                    process.Kill(true);
                }
            }
            catch
            {
            }
        }

        var currentExecutable = Environment.ProcessPath ?? LinksyInstallInfo.UninstallerPath;
        var cleanupCommand = $"ping 127.0.0.1 -n 3 > nul && rmdir /s /q \"{installDirectory}\"";
        Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c {cleanupCommand}",
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
            WorkingDirectory = Path.GetDirectoryName(currentExecutable) ?? installDirectory
        });

        MessageBox.Show(
            "Linksy uninstall has been started. The install directory will be removed after this window closes.",
            "Linksy Uninstaller",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }
}
