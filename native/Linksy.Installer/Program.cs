using System.Drawing;
using System.Windows.Forms;
using Linksy.NativeCommon;

namespace Linksy.Installer;

internal static class Program
{
    [STAThread]
    private static async Task Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var installDirectory = PromptForInstallDirectory();
        if (string.IsNullOrWhiteSpace(installDirectory))
        {
            return;
        }

        if (MessageBox.Show(
                $"Install Linksy to:{Environment.NewLine}{installDirectory}",
                "Linksy Installer",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question) != DialogResult.Yes)
        {
            return;
        }

        var payloadDirectory = ResolvePayloadDirectory();
        if (!Directory.Exists(payloadDirectory))
        {
            MessageBox.Show(
                $"Missing payload directory near:{Environment.NewLine}{AppContext.BaseDirectory}",
                "Linksy Installer",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        Directory.CreateDirectory(installDirectory);
        foreach (var sourceFile in Directory.GetFiles(payloadDirectory))
        {
            File.Copy(sourceFile, Path.Combine(installDirectory, Path.GetFileName(sourceFile)), true);
        }

        LinksyInstallInfo.WriteUninstallRegistration(installDirectory);
        LinksyInstallInfo.CreateStartMenuShortcuts(installDirectory);

        if (MessageBox.Show("Do you want the installer to create a desktop shortcut?", "Linksy Installer", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
        {
            LinksyInstallInfo.CreateDesktopShortcut(installDirectory);
        }

        if (MessageBox.Show("Do you want Linksy to start automatically when you sign in?", "Linksy Installer", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
        {
            LinksyInstallInfo.EnableAutoStartOnLogin(installDirectory);
        }

        if (MessageBox.Show("Do you want the installer to add the Explorer context menu now?", "Linksy Installer", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
        {
            LinksyInstallInfo.InstallContextMenu(installDirectory);
        }

        if (MessageBox.Show("Linksy installed successfully. Launch the server now?", "Linksy Installer", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
        {
            if (!LinksyInstallInfo.StartLauncher(installDirectory))
            {
                MessageBox.Show("Linksy was installed, but the launcher could not be started.", "Linksy Installer", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            else
            {
                _ = LinksyInstallInfo.WaitForHealthyServerAsync();
            }
        }

        MessageBox.Show(
            $"Linksy installed successfully.{Environment.NewLine}{Environment.NewLine}Location:{Environment.NewLine}{installDirectory}",
            "Linksy Installer",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private static string? PromptForInstallDirectory()
    {
        using var form = new InstallLocationForm(LinksyInstallInfo.DefaultInstallDirectory);
        return form.ShowDialog() == DialogResult.OK ? form.SelectedPath : null;
    }

    private static string ResolvePayloadDirectory()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "payload"),
            Path.Combine(AppContext.BaseDirectory, "bundle", "payload")
        };

        return candidates.FirstOrDefault(Directory.Exists) ?? candidates[0];
    }
}

internal sealed class InstallLocationForm : Form
{
    private readonly TextBox pathTextBox;

    public InstallLocationForm(string defaultPath)
    {
        Text = "Linksy Installer";
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = true;
        ClientSize = new Size(560, 180);

        Controls.Add(new Label
        {
            Text = "Choose where Linksy should be installed.",
            Left = 16,
            Top = 16,
            Width = 520,
            Height = 24
        });

        pathTextBox = new TextBox
        {
            Left = 16,
            Top = 56,
            Width = 420,
            Text = defaultPath
        };
        Controls.Add(pathTextBox);

        var browseButton = new Button
        {
            Text = "Browse...",
            Left = 446,
            Top = 54,
            Width = 90,
            Height = 28
        };
        browseButton.Click += (_, _) =>
        {
            using var picker = new FolderTreeForm(SelectedPath);
            if (picker.ShowDialog(this) == DialogResult.OK && !string.IsNullOrWhiteSpace(picker.SelectedPath))
            {
                pathTextBox.Text = picker.SelectedPath;
            }
        };
        Controls.Add(browseButton);

        Controls.Add(new Label
        {
            Text = "You can type a path directly or use Browse.",
            Left = 16,
            Top = 92,
            Width = 520,
            Height = 24
        });

        var installButton = new Button
        {
            Text = "Install",
            Left = 350,
            Top = 126,
            Width = 90,
            Height = 30,
            DialogResult = DialogResult.OK
        };
        installButton.Click += (_, _) =>
        {
            if (string.IsNullOrWhiteSpace(SelectedPath))
            {
                MessageBox.Show("Please choose an install directory.", "Linksy Installer", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                DialogResult = DialogResult.None;
            }
        };
        Controls.Add(installButton);

        var cancelButton = new Button
        {
            Text = "Cancel",
            Left = 446,
            Top = 126,
            Width = 90,
            Height = 30,
            DialogResult = DialogResult.Cancel
        };
        Controls.Add(cancelButton);

        AcceptButton = installButton;
        CancelButton = cancelButton;
    }

    public string SelectedPath => pathTextBox.Text.Trim();
}

internal sealed class FolderTreeForm : Form
{
    private readonly TreeView treeView;
    private readonly TextBox pathPreview;

    public FolderTreeForm(string initialPath)
    {
        Text = "Select Install Folder";
        StartPosition = FormStartPosition.CenterParent;
        ClientSize = new Size(620, 460);
        MinimizeBox = false;
        MaximizeBox = false;

        treeView = new TreeView
        {
            Left = 12,
            Top = 12,
            Width = 596,
            Height = 370
        };
        treeView.BeforeExpand += (_, e) => PopulateNode(e.Node);
        treeView.AfterSelect += (_, e) => pathPreview.Text = e.Node.Tag as string ?? "";
        Controls.Add(treeView);

        pathPreview = new TextBox
        {
            Left = 12,
            Top = 390,
            Width = 596,
            ReadOnly = true
        };
        Controls.Add(pathPreview);

        var selectButton = new Button
        {
            Text = "Select",
            Left = 428,
            Top = 420,
            Width = 86,
            DialogResult = DialogResult.OK
        };
        selectButton.Click += (_, _) =>
        {
            if (treeView.SelectedNode == null)
            {
                DialogResult = DialogResult.None;
            }
        };
        Controls.Add(selectButton);

        var cancelButton = new Button
        {
            Text = "Cancel",
            Left = 522,
            Top = 420,
            Width = 86,
            DialogResult = DialogResult.Cancel
        };
        Controls.Add(cancelButton);

        AcceptButton = selectButton;
        CancelButton = cancelButton;

        LoadRoots();
        SelectInitial(initialPath);
    }

    public string SelectedPath => treeView.SelectedNode?.Tag as string ?? "";

    private void LoadRoots()
    {
        treeView.Nodes.Clear();
        foreach (var drive in DriveInfo.GetDrives().Where(d => d.IsReady))
        {
            treeView.Nodes.Add(CreateDirectoryNode(drive.RootDirectory.FullName));
        }
    }

    private void SelectInitial(string initialPath)
    {
        if (treeView.Nodes.Count == 0)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(initialPath))
        {
            treeView.SelectedNode = treeView.Nodes[0];
            return;
        }

        var normalized = Path.GetFullPath(initialPath);
        foreach (TreeNode root in treeView.Nodes)
        {
            var rootPath = root.Tag as string ?? "";
            if (!normalized.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            treeView.SelectedNode = root;
            ExpandToPath(root, normalized);
            break;
        }
    }

    private void ExpandToPath(TreeNode node, string targetPath)
    {
        PopulateNode(node);
        node.Expand();

        foreach (TreeNode child in node.Nodes)
        {
            var childPath = child.Tag as string ?? "";
            if (targetPath.StartsWith(childPath, StringComparison.OrdinalIgnoreCase))
            {
                treeView.SelectedNode = child;
                pathPreview.Text = childPath;
                ExpandToPath(child, targetPath);
                return;
            }
        }
    }

    private TreeNode CreateDirectoryNode(string directoryPath)
    {
        var node = new TreeNode(directoryPath) { Tag = directoryPath };
        TryAddPlaceholder(node);
        return node;
    }

    private void PopulateNode(TreeNode node)
    {
        if (node.Nodes.Count != 1 || (node.Nodes[0].Tag as string) != "__placeholder__")
        {
            return;
        }

        node.Nodes.Clear();
        var directoryPath = node.Tag as string;
        if (string.IsNullOrWhiteSpace(directoryPath))
        {
            return;
        }

        try
        {
            foreach (var directory in Directory.GetDirectories(directoryPath).OrderBy(p => p))
            {
                node.Nodes.Add(CreateDirectoryNode(directory));
            }
        }
        catch
        {
        }
    }

    private void TryAddPlaceholder(TreeNode node)
    {
        try
        {
            var path = node.Tag as string;
            if (!string.IsNullOrWhiteSpace(path) && Directory.GetDirectories(path).Length > 0)
            {
                node.Nodes.Add(new TreeNode("Loading...") { Tag = "__placeholder__" });
            }
        }
        catch
        {
        }
    }
}
