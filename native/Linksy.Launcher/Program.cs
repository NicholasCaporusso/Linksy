using System.Windows.Forms;
using Linksy.NativeCommon;

namespace Linksy.Launcher;

internal static class Program
{
    [STAThread]
    private static async Task Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        if (await LinksyInstallInfo.WaitForHealthyServerAsync(1200))
        {
            return;
        }

        var currentExecutable = Environment.ProcessPath ?? string.Empty;
        var portableExecutable = LinksyInstallInfo.ResolvePortableExecutablePath(currentExecutable);
        var executablePath = portableExecutable ?? LinksyInstallInfo.ExecutablePath;
        var installDirectory = Path.GetDirectoryName(executablePath) ?? LinksyInstallInfo.InstallDirectory;

        if (!File.Exists(executablePath))
        {
            MessageBox.Show(
                $"Linksy could not find linksy.exe near:{Environment.NewLine}{currentExecutable}",
                "Linksy Launcher",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        if (!LinksyInstallInfo.StartInstalledExecutable("serve", installDirectory))
        {
            MessageBox.Show(
                $"Linksy could not be started from:{Environment.NewLine}{executablePath}",
                "Linksy Launcher",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        _ = LinksyInstallInfo.WaitForHealthyServerAsync();
    }
}
