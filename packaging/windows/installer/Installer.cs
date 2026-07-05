using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

internal static class Installer
{
    private const string ProductName = "Delivery ERP";
    private const string VersionLabel = "1.0 Beta";

    [STAThread]
    private static int Main()
    {
        try
        {
            var installRoot = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                ProductName);
            var startMenuRoot = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft", "Windows", "Start Menu", "Programs", ProductName);
            var startShortcut = Path.Combine(startMenuRoot, ProductName + ".lnk");

            if (Directory.Exists(installRoot))
            {
                Directory.Delete(installRoot, true);
            }
            Directory.CreateDirectory(installRoot);
            Directory.CreateDirectory(startMenuRoot);

            var payloadPath = Path.Combine(Path.GetTempPath(), "DeliveryERP-Payload-" + Guid.NewGuid().ToString("N") + ".zip");
            using (var resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
            {
                if (resource == null)
                {
                    throw new InvalidOperationException("Embedded application payload was not found.");
                }
                using (var file = File.Create(payloadPath))
                {
                    resource.CopyTo(file);
                }
            }

            ZipFile.ExtractToDirectory(payloadPath, installRoot);
            File.Delete(payloadPath);

            var launcherPath = Path.Combine(installRoot, "Delivery ERP.exe");
            var iconPath = Path.Combine(installRoot, "delivery-erp.ico");
            CreateShortcut(startShortcut, launcherPath, iconPath);
            CreateDesktopShortcuts(launcherPath, iconPath);

            return 0;
        }
        catch (Exception ex)
        {
            try
            {
                var logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "DeliveryERP-install.log");
                File.WriteAllText(logPath, ex.ToString());
            }
            catch
            {
            }

            MessageBox.Show(
                "Installation failed: " + ex.Message,
                ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void CreateShortcut(string shortcutPath, string launcherPath, string iconPath)
    {
        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null)
        {
            throw new InvalidOperationException("Windows shortcut service is unavailable.");
        }

        dynamic shell = Activator.CreateInstance(shellType);
        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = launcherPath;
        shortcut.Arguments = "";
        shortcut.WorkingDirectory = Path.GetDirectoryName(launcherPath);
        shortcut.IconLocation = iconPath;
        shortcut.Description = ProductName + " " + VersionLabel + " - Delivery Project Management ERP";
        shortcut.Save();
    }

    private static void CreateDesktopShortcuts(string launcherPath, string iconPath)
    {
        var desktopDirectories = new List<string>();
        AddIfPresent(desktopDirectories, Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory));

        var userProfile = Environment.GetEnvironmentVariable("USERPROFILE");
        if (string.IsNullOrWhiteSpace(userProfile))
        {
            userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        }
        if (!string.IsNullOrWhiteSpace(userProfile))
        {
            desktopDirectories.Add(Path.Combine(userProfile, "Desktop"));
        }

        AddIfPresent(desktopDirectories, Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory));

        var created = false;
        foreach (var desktopDirectory in desktopDirectories)
        {
            try
            {
                Directory.CreateDirectory(desktopDirectory);
                CreateShortcut(Path.Combine(desktopDirectory, ProductName + ".lnk"), launcherPath, iconPath);
                created = true;
            }
            catch
            {
            }
        }

        if (!created)
        {
            throw new InvalidOperationException("Desktop shortcut could not be created.");
        }
    }

    private static void AddIfPresent(List<string> values, string value)
    {
        if (!string.IsNullOrWhiteSpace(value) && !values.Contains(value))
        {
            values.Add(value);
        }
    }
}
