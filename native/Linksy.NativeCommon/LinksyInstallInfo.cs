using Microsoft.Win32;
using System.Diagnostics;
using System.Net.Http;
using System.Runtime.InteropServices;

namespace Linksy.NativeCommon;

internal static class LinksyInstallInfo
{
    public static string AppName => "Linksy";
    public static int PreferredPort => 54657;
    public static string DataDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Linksy");
    public static string DefaultInstallDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Linksy");
    public static string InstallDirectory => GetInstallDirectory();

    public static string StartMenuDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
        "Programs",
        "Linksy");
    public static string DesktopDirectory => Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
    public static string StartupDirectory => Environment.GetFolderPath(Environment.SpecialFolder.Startup);

    public static string ExecutablePath => GetExecutablePath();
    public static string LauncherPath => GetLauncherPath();
    public static string UninstallerPath => GetUninstallerPath();
    public static string IconPath => GetIconPath();
    public static string HiddenLauncherScriptPath => GetHiddenLauncherScriptPath();
    public static string PortFilePath => GetPortFilePath();
    public static string LauncherShortcutPath => Path.Combine(StartMenuDirectory, "Linksy.lnk");
    public static string UninstallerShortcutPath => Path.Combine(StartMenuDirectory, "Uninstall Linksy.lnk");
    public static string DesktopShortcutPath => Path.Combine(DesktopDirectory, "Linksy.lnk");
    public static string StartupShortcutPath => Path.Combine(StartupDirectory, "Linksy.lnk");
    public static string UninstallRegistryKey => @"Software\Microsoft\Windows\CurrentVersion\Uninstall\Linksy";

    private static readonly string[] ContextMenuRoots =
    {
        @"Software\Classes\*\shell",
        @"Software\Classes\Directory\shell",
        @"Software\Classes\Directory\Background\shell",
        @"Software\Classes\Folder\shell",
        @"Software\Classes\AllFilesystemObjects\shell"
    };

    private static readonly string[] ContextMenuKeyNames =
    {
        "NotionPathOpener",
        "Linksy",
        "LinksyContextMenu",
        "GetLinksyLink"
    };

    public static string GetInstallDirectory(string? installDirectory = null) => installDirectory ?? ReadRegisteredInstallDirectory() ?? DefaultInstallDirectory;
    public static string GetExecutablePath(string? installDirectory = null) => Path.Combine(GetInstallDirectory(installDirectory), "linksy.exe");
    public static string GetLauncherPath(string? installDirectory = null) => Path.Combine(GetInstallDirectory(installDirectory), "LinksyLauncher.exe");
    public static string GetUninstallerPath(string? installDirectory = null) => Path.Combine(GetInstallDirectory(installDirectory), "LinksyUninstaller.exe");
    public static string GetIconPath(string? installDirectory = null) => Path.Combine(GetInstallDirectory(installDirectory), "icon.ico");
    public static string GetHiddenLauncherScriptPath(string? installDirectory = null) => Path.Combine(GetInstallDirectory(installDirectory), "copy-link-hidden.vbs");
    public static string GetPortFilePath(string? installDirectory = null) => Path.Combine(DataDirectory, "port.txt");

    public static string? ResolvePortableExecutablePath(string currentExecutablePath)
    {
        var baseDirectory = Path.GetDirectoryName(currentExecutablePath);
        if (string.IsNullOrWhiteSpace(baseDirectory))
        {
            return null;
        }

        var candidates = new[]
        {
            Path.Combine(baseDirectory, "linksy.exe"),
            Path.Combine(baseDirectory, "payload", "linksy.exe")
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    public static void WriteUninstallRegistration(string? installDirectory = null)
    {
        var resolvedInstallDirectory = GetInstallDirectory(installDirectory);
        using var key = Registry.CurrentUser.CreateSubKey(UninstallRegistryKey);
        if (key == null)
        {
            return;
        }

        key.SetValue("DisplayName", AppName);
        key.SetValue("DisplayVersion", "1.0.0");
        key.SetValue("InstallLocation", resolvedInstallDirectory);
        key.SetValue("DisplayIcon", GetIconPath(resolvedInstallDirectory));
        key.SetValue("UninstallString", $"\"{GetUninstallerPath(resolvedInstallDirectory)}\"");
        key.SetValue("Publisher", "Linksy");
    }

    public static void RemoveUninstallRegistration() => Registry.CurrentUser.DeleteSubKeyTree(UninstallRegistryKey, false);

    public static void CreateStartMenuShortcuts(string? installDirectory = null)
    {
        var resolvedInstallDirectory = GetInstallDirectory(installDirectory);
        Directory.CreateDirectory(StartMenuDirectory);
        CreateShortcut(LauncherShortcutPath, GetLauncherPath(resolvedInstallDirectory), "", resolvedInstallDirectory, GetIconPath(resolvedInstallDirectory), "Launch Linksy");
        CreateShortcut(UninstallerShortcutPath, GetUninstallerPath(resolvedInstallDirectory), "", resolvedInstallDirectory, GetIconPath(resolvedInstallDirectory), "Remove Linksy");
    }

    public static void RemoveStartMenuShortcuts()
    {
        if (Directory.Exists(StartMenuDirectory))
        {
            Directory.Delete(StartMenuDirectory, true);
        }
    }

    public static void CreateDesktopShortcut(string? installDirectory = null)
    {
        var resolvedInstallDirectory = GetInstallDirectory(installDirectory);
        CreateShortcut(DesktopShortcutPath, GetLauncherPath(resolvedInstallDirectory), "", resolvedInstallDirectory, GetIconPath(resolvedInstallDirectory), "Launch Linksy");
    }

    public static void RemoveDesktopShortcut() => DeleteIfExists(DesktopShortcutPath);

    public static void EnableAutoStartOnLogin(string? installDirectory = null)
    {
        var resolvedInstallDirectory = GetInstallDirectory(installDirectory);
        CreateShortcut(StartupShortcutPath, GetLauncherPath(resolvedInstallDirectory), "", resolvedInstallDirectory, GetIconPath(resolvedInstallDirectory), "Launch Linksy at sign-in");
    }

    public static void DisableAutoStartOnLogin() => DeleteIfExists(StartupShortcutPath);

    public static void RemoveShortcutArtifacts()
    {
        RemoveStartMenuShortcuts();
        RemoveDesktopShortcut();
        DisableAutoStartOnLogin();
    }

    public static bool StartInstalledExecutable(string arguments, string? installDirectory = null)
    {
        var resolvedInstallDirectory = GetInstallDirectory(installDirectory);
        var executablePath = GetExecutablePath(resolvedInstallDirectory);
        return File.Exists(executablePath) && StartProcess(executablePath, arguments, resolvedInstallDirectory);
    }

    public static bool StartLauncher(string? installDirectory = null)
    {
        var resolvedInstallDirectory = GetInstallDirectory(installDirectory);
        var launcherPath = GetLauncherPath(resolvedInstallDirectory);
        return File.Exists(launcherPath) && StartProcess(launcherPath, "", resolvedInstallDirectory);
    }

    public static async Task<bool> WaitForHealthyServerAsync(int timeoutMs = 12000, CancellationToken cancellationToken = default)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(1200) };
        var started = DateTime.UtcNow;
        while (DateTime.UtcNow - started < TimeSpan.FromMilliseconds(timeoutMs))
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var port in GetCandidatePorts())
            {
                try
                {
                    using var response = await client.GetAsync($"http://127.0.0.1:{port}/health", cancellationToken);
                    if (response.IsSuccessStatusCode)
                    {
                        return true;
                    }
                }
                catch
                {
                }
            }

            await Task.Delay(250, cancellationToken);
        }

        return false;
    }

    public static void InstallContextMenu(string installDirectory)
    {
        RemoveContextMenu();
        var iconPath = GetIconPath(installDirectory);
        var command = BuildContextMenuCommand(installDirectory, "%1");
        var backgroundCommand = BuildContextMenuCommand(installDirectory, "%V");
        WriteContextMenuKey(@"Software\Classes\*\shell\NotionPathOpener", "Get Linksy link", iconPath, command);
        WriteContextMenuKey(@"Software\Classes\Directory\shell\NotionPathOpener", "Get Linksy link", iconPath, command);
        WriteContextMenuKey(@"Software\Classes\Directory\Background\shell\NotionPathOpener", "Get Linksy link", iconPath, backgroundCommand);
    }

    public static void RemoveContextMenu()
    {
        foreach (var root in ContextMenuRoots)
        {
            foreach (var keyName in ContextMenuKeyNames)
            {
                Registry.CurrentUser.DeleteSubKeyTree($@"{root}\{keyName}", false);
            }
        }
    }

    private static IEnumerable<int> GetCandidatePorts()
    {
        var seen = new HashSet<int>();
        foreach (var candidate in new[] { PreferredPort, ReadStoredPort() })
        {
            if (candidate > 0 && seen.Add(candidate))
            {
                yield return candidate;
            }
        }
    }

    private static int ReadStoredPort()
    {
        try
        {
            var path = GetPortFilePath();
            if (!File.Exists(path))
            {
                return 0;
            }

            var raw = File.ReadAllText(path).Trim();
            return int.TryParse(raw, out var port) ? port : 0;
        }
        catch
        {
            return 0;
        }
    }

    private static bool StartProcess(string fileName, string arguments, string workingDirectory)
    {
        var info = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };

        return Process.Start(info) != null;
    }

    private static void WriteContextMenuKey(string relativeKeyPath, string label, string iconPath, string command)
    {
        using var key = Registry.CurrentUser.CreateSubKey(relativeKeyPath);
        if (key == null)
        {
            return;
        }

        key.SetValue("", label);
        key.SetValue("Icon", iconPath);
        using var commandKey = key.CreateSubKey("command");
        commandKey?.SetValue("", command);
    }

    private static string BuildContextMenuCommand(string installDirectory, string placeholder)
    {
        var wscript = @"C:\Windows\System32\wscript.exe";
        var script = GetHiddenLauncherScriptPath(installDirectory);
        var executable = GetExecutablePath(installDirectory);
        return $"\"{wscript}\" \"{script}\" \"{executable}\" \"\" \"{placeholder}\"";
    }

    private static string? ReadRegisteredInstallDirectory()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(UninstallRegistryKey);
            return key?.GetValue("InstallLocation") as string;
        }
        catch
        {
            return null;
        }
    }

    private static void CreateShortcut(string shortcutPath, string targetPath, string arguments, string workingDirectory, string iconPath, string description)
    {
        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null)
        {
            return;
        }

        dynamic? shell = null;
        dynamic? shortcut = null;
        try
        {
            shell = Activator.CreateInstance(shellType);
            shortcut = shell?.CreateShortcut(shortcutPath);
            if (shortcut == null)
            {
                return;
            }

            shortcut.TargetPath = targetPath;
            shortcut.Arguments = arguments;
            shortcut.WorkingDirectory = workingDirectory;
            shortcut.IconLocation = iconPath;
            shortcut.Description = description;
            shortcut.Save();
        }
        finally
        {
            if (shortcut != null && Marshal.IsComObject(shortcut)) Marshal.FinalReleaseComObject(shortcut);
            if (shell != null && Marshal.IsComObject(shell)) Marshal.FinalReleaseComObject(shell);
        }
    }

    private static void DeleteIfExists(string filePath)
    {
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
