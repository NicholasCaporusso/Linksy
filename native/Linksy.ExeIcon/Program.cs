using System.Runtime.InteropServices;

if (args.Length != 2)
{
    Console.Error.WriteLine("Usage: LinksyExeIcon <exe> <ico>");
    return 1;
}

var exePath = Path.GetFullPath(args[0]);
var iconPath = Path.GetFullPath(args[1]);
if (!File.Exists(exePath) || !File.Exists(iconPath))
{
    Console.Error.WriteLine("The target EXE or ICO file does not exist.");
    return 1;
}

var iconBytes = File.ReadAllBytes(iconPath);
var handle = BeginUpdateResource(exePath, false);
if (handle == IntPtr.Zero)
{
    Console.Error.WriteLine("BeginUpdateResource failed.");
    return 1;
}

try
{
    var buffer = Marshal.AllocHGlobal(iconBytes.Length);
    try
    {
        Marshal.Copy(iconBytes, 0, buffer, iconBytes.Length);
        if (!UpdateResource(handle, (IntPtr)3, (IntPtr)1, 0, buffer, iconBytes.Length))
        {
            Console.Error.WriteLine("UpdateResource failed.");
            return 1;
        }
    }
    finally
    {
        Marshal.FreeHGlobal(buffer);
    }

    if (!EndUpdateResource(handle, false))
    {
        Console.Error.WriteLine("EndUpdateResource failed.");
        return 1;
    }

    handle = IntPtr.Zero;
    return 0;
}
finally
{
    if (handle != IntPtr.Zero)
    {
        EndUpdateResource(handle, true);
    }
}

[DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);

[DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
static extern bool UpdateResource(IntPtr hUpdate, IntPtr lpType, IntPtr lpName, ushort wLanguage, IntPtr lpData, int cbData);

[DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);
