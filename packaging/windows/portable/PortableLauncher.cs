using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

internal static class PortableLauncher
{
    private const string ProductName = "Delivery ERP";

    [STAThread]
    private static int Main()
    {
        try
        {
            var portableRoot = Path.Combine(Path.GetTempPath(), "DeliveryERP-1.0-Beta-Portable");
            if (Directory.Exists(portableRoot))
            {
                Directory.Delete(portableRoot, true);
            }
            Directory.CreateDirectory(portableRoot);

            var payloadPath = Path.Combine(Path.GetTempPath(), "DeliveryERP-Portable-Payload-" + Guid.NewGuid().ToString("N") + ".zip");
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

            ZipFile.ExtractToDirectory(payloadPath, portableRoot);
            File.Delete(payloadPath);

            Process.Start(new ProcessStartInfo
            {
                FileName = Path.Combine(portableRoot, "Delivery ERP.exe"),
                Arguments = "",
                WorkingDirectory = portableRoot,
                UseShellExecute = true
            });
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Delivery ERP portable launch failed: " + ex.Message,
                ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }
    }

    private static string Quote(string value)
    {
        return "\"" + value + "\"";
    }
}
