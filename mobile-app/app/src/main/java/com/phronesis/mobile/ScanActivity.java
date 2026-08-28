package com.phronesis.mobile;

import android.graphics.Bitmap;
import android.graphics.Rect;
import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ScanActivity extends AppCompatActivity {
    private PreviewView previewView;
    private ExecutorService executor;
    private volatile boolean scanning = true;
    private final MultiFormatReader reader = new MultiFormatReader();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        previewView = new PreviewView(this);
        setContentView(previewView);
        executor = Executors.newSingleThreadExecutor();
        startCamera();
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                ProcessCameraProvider provider = future.get();
                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                ImageAnalysis analysis = new ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();
                analysis.setAnalyzer(executor, this::analyze);
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
            } catch (Exception e) {
                Toast.makeText(this, "相机启动失败：" + e.getMessage(), Toast.LENGTH_SHORT).show();
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void analyze(@NonNull ImageProxy imageProxy) {
        if (!scanning) { imageProxy.close(); return; }
        try {
            Bitmap bitmap = imageProxy.toBitmap();
            if (bitmap == null) { imageProxy.close(); return; }

            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            if (width > 1000) {
                float scale = 1000f / width;
                bitmap = Bitmap.createScaledBitmap(bitmap, 1000, (int) (height * scale), true);
                width = bitmap.getWidth();
                height = bitmap.getHeight();
            }
            int[] pixels = new int[width * height];
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height);
            bitmap.recycle();

            RGBLuminanceSource source = new RGBLuminanceSource(width, height, pixels);
            BinaryBitmap binary = new BinaryBitmap(new HybridBinarizer(source));
            String value = reader.decode(binary).getText();
            if (value != null && !value.isEmpty()) {
                scanning = false;
                returnResult(value);
            }
        } catch (Throwable ignored) {
            // 未识别到二维码，继续下一帧
        } finally {
            imageProxy.close();
        }
    }

    private void returnResult(String value) {
        setResult(RESULT_OK, new android.content.Intent().putExtra("SCAN_RESULT", value));
        finish();
    }

    @Override
    protected void onDestroy() {
        scanning = false;
        if (executor != null) executor.shutdown();
        super.onDestroy();
    }
}
