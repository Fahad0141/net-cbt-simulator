package com.netcbt.simulator;

import android.app.Activity;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Prints the page on screen through Android's print framework, whose dialog also offers
 * "Save as PDF". window.print() does nothing in a WebView. Called from src/platform/native.ts.
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    private static final String DEFAULT_JOB_NAME = "NET CBT Simulator";

    @PluginMethod
    public void print(PluginCall call) {
        // The job name is also the suggested PDF file name; PrintManager rejects an empty one.
        String requested = call.getString("name");
        final String name = requested == null || requested.trim().isEmpty()
            ? DEFAULT_JOB_NAME
            : requested.trim();
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("The app is not ready to print");
            return;
        }
        // WebView methods must run on the UI thread; plugin calls arrive on a background thread.
        activity.runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                PrintManager printManager =
                    (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (webView == null || printManager == null) {
                    call.reject("Printing is not available on this device");
                    return;
                }
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(name);
                // The paper is laid out for A4 with its own CSS @page margins, so ask for no extra
                // margins; the dialog still lets the user pick another size.
                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
                printManager.print(name, adapter, attributes);
                call.resolve();
            } catch (Exception e) {
                call.reject("Could not open the print dialog", e);
            }
        });
    }
}
