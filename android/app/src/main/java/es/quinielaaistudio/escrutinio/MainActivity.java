package es.quinielaaistudio.escrutinio;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class MainActivity extends Activity {
    private static final int PICK_TXT = 41;
    private static final int MAX_DOWNLOAD = 25 * 1024 * 1024;
    private static final int MAX_TXT = 2 * 1024 * 1024;
    private WebView webView;
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        webView = new WebView(this);
        webView.setBackgroundColor(0xff06162c);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(false);
        webView.getSettings().setAllowFileAccessFromFileURLs(false);
        webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }
        });
        webView.addJavascriptInterface(new Bridge(), "Android");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private byte[] download(String address) throws Exception {
        URL url = new URL(address);
        String host = url.getHost();
        if (!url.getProtocol().equals("https") || !(host.equals("www.win1x2.com") ||
                host.equals("static.dataradar.es"))) {
            throw new IllegalArgumentException("Proveedor no permitido");
        }
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(20000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Connection", "close");
        connection.setRequestProperty("User-Agent", "QuinielaAIStudioMovil/0.1");
        connection.setRequestProperty("Cache-Control", "no-cache");
        try (InputStream input = new BufferedInputStream(connection.getInputStream());
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                if (output.size() > MAX_DOWNLOAD) throw new IllegalStateException("Descarga demasiado grande");
            }
            return output.toByteArray();
        } finally {
            connection.disconnect();
        }
    }

    private String decode(byte[] bytes) {
        String utf8 = new String(bytes, StandardCharsets.UTF_8);
        return utf8.indexOf('\ufffd') >= 0 ? new String(bytes, Charset.forName("windows-1252")) : utf8;
    }

    public class Bridge {
        @JavascriptInterface public void request(String id, String method, String argument) {
            io.execute(() -> {
                String result;
                if (method.equals("winData")) result = fetchWinData();
                else if (method.equals("text")) result = fetchText(argument);
                else result = "__ERROR__Operación desconocida";
                final String response = result;
                runOnUiThread(() -> {
                    if (!isDestroyed() && !isFinishing()) webView.evaluateJavascript(
                            "window.onNativeResponse(" + JSONObject.quote(id) + "," + JSONObject.quote(response) + ")", null);
                });
            });
        }

        private String fetchText(String address) {
            try { return decode(download(address)); }
            catch (Exception error) { return "__ERROR__" + error.getMessage(); }
        }

        private String fetchWinData() {
            try {
                byte[] archive = download("https://www.win1x2.com/datos/actudato.zip");
                Map<String, byte[]> files = new HashMap<>();
                String newestSeason = "";
                int newestStartYear = 0;
                int total = 0;
                try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
                    ZipEntry entry;
                    while ((entry = zip.getNextEntry()) != null) {
                        if (entry.isDirectory()) continue;
                        String name = entry.getName().replace('\\', '/');
                        name = name.substring(name.lastIndexOf('/') + 1).toUpperCase(Locale.ROOT);
                        if (!name.matches("(?:FEC|PRE|HOR)\\d{2}-\\d{2}\\.TXT") &&
                                !name.equals("WEQUIPOS.TXT")) continue;
                        ByteArrayOutputStream output = new ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int count;
                        while ((count = zip.read(buffer)) != -1) {
                            output.write(buffer, 0, count);
                            total += count;
                            if (output.size() > MAX_DOWNLOAD || total > 60 * 1024 * 1024)
                                throw new IllegalStateException("Paquete de datos demasiado grande");
                        }
                        files.put(name, output.toByteArray());
                        if (name.matches("FEC\\d{2}-\\d{2}\\.TXT")) {
                            String season = name.substring(3, 8);
                            int shortYear = Integer.parseInt(season.substring(0, 2));
                            int fullYear = shortYear >= 90 ? 1900 + shortYear : 2000 + shortYear;
                            if (fullYear > newestStartYear && fullYear <= Calendar.getInstance().get(Calendar.YEAR) + 1) {
                                newestStartYear = fullYear;
                                newestSeason = season;
                            }
                        }
                    }
                }
                if (newestSeason.isEmpty()) throw new IllegalStateException("No se encontró ninguna temporada");
                JSONObject result = new JSONObject();
                result.put("season", newestSeason);
                for (Map.Entry<String, byte[]> item : files.entrySet())
                    result.put(item.getKey(), decode(item.getValue()));
                return result.toString();
            } catch (Exception error) {
                return "__ERROR__" + error.getMessage();
            }
        }

        @JavascriptInterface public void pickTextFile() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/plain");
                startActivityForResult(intent, PICK_TXT);
            });
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_TXT || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        io.execute(() -> {
            try (InputStream input = getContentResolver().openInputStream(uri);
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                String name = "TXT";
                try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0);
                }
                if (input == null) throw new IllegalStateException("No se pudo abrir el archivo");
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    if (output.size() > MAX_TXT) throw new IllegalStateException("TXT demasiado grande");
                }
                String script = "window.onImportedText(" + JSONObject.quote(decode(output.toByteArray())) + "," + JSONObject.quote(name) + ")";
                runOnUiThread(() -> { if (!isDestroyed()) webView.evaluateJavascript(script, null); });
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(this, "No se pudo leer el TXT: " + error.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    @Override protected void onDestroy() {
        io.shutdownNow();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
