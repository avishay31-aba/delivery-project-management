using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class DeliveryErpLauncher
{
    private const string ProductName = "Delivery ERP";
    private const int Port = 47831;
    private static readonly string BaseUrl = "http://127.0.0.1:" + Port + "/";

    [STAThread]
    private static int Main()
    {
        try
        {
            var appRoot = AppDomain.CurrentDomain.BaseDirectory;
            var webRoot = Path.Combine(appRoot, "app");
            if (!File.Exists(Path.Combine(webRoot, "index.html")))
            {
                MessageBox.Show(
                    ProductName + " could not find its application files.",
                    ProductName,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 1;
            }

            TcpListener listener;
            try
            {
                listener = new TcpListener(IPAddress.Loopback, Port);
                listener.Start();
            }
            catch
            {
                OpenApp();
                return 0;
            }

            OpenApp();
            while (true)
            {
                var client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(_ => ServeClient(client, webRoot));
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                ProductName + " failed to start: " + ex.Message,
                ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void OpenApp()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = BaseUrl,
            UseShellExecute = true
        });
    }

    private static void ServeClient(TcpClient client, string webRoot)
    {
        using (client)
        {
            try
            {
                var stream = client.GetStream();
                var buffer = new byte[8192];
                var read = stream.Read(buffer, 0, buffer.Length);
                if (read <= 0)
                {
                    return;
                }

                var requestLine = Encoding.ASCII.GetString(buffer, 0, read).Split(new[] { "\r\n" }, StringSplitOptions.None)[0];
                var parts = requestLine.Split(' ');
                var requestPath = parts.Length > 1 ? Uri.UnescapeDataString(parts[1].Split('?')[0]) : "/";
                if (requestPath == "/")
                {
                    requestPath = "/index.html";
                }

                var relativePath = requestPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var candidate = Path.GetFullPath(Path.Combine(webRoot, relativePath));
                var root = Path.GetFullPath(webRoot);
                if (!candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(candidate))
                {
                    candidate = Path.Combine(webRoot, "index.html");
                }

                var body = File.ReadAllBytes(candidate);
                var header = Encoding.ASCII.GetBytes(
                    "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: " + ContentType(candidate) + "\r\n" +
                    "Content-Length: " + body.Length + "\r\n" +
                    "Cache-Control: no-cache\r\n" +
                    "Connection: close\r\n\r\n");
                stream.Write(header, 0, header.Length);
                stream.Write(body, 0, body.Length);
            }
            catch
            {
            }
        }
    }

    private static string ContentType(string path)
    {
        switch (Path.GetExtension(path).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg":
            case ".jpeg": return "image/jpeg";
            case ".ico": return "image/x-icon";
            default: return "application/octet-stream";
        }
    }
}
