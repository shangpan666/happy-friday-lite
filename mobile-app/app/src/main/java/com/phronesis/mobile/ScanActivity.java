package com.phronesis.mobile;

import android.os.Bundle;
import android.util.Size;
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
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ScanActivity extends AppCompatActivity {
    private PreviewView previewView;
    private ExecutorService executor;
    private volatile boolean scanning = true;

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
                        .setTargetResolution(new Size(1280, 720))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();
                analysis.setAnalyzer(executor, new ImageAnalysis.Analyzer() {
                    @Override
                    public void analyze(@NonNull ImageProxy imageProxy) {
                        if (!scanning) { imageProxy.close(); return; }
                        try {
                            InputImage img = InputImage.fromMediaImage(
                                    imageProxy.getImage(),
                                    imageProxy.getImageInfo().getRotationDegrees());
                            BarcodeScanning.getClient().process(img)
                                    .addOnSuccessListener(barcodes -> {
                                        for (Barcode b : barcodes) {
                                            String v = b.getRawValue();
                                            if (v != null && !v.isEmpty()) {
                                                scanning = false;
                                                returnResult(v);
                                                break;
                                            }
                                        }
                                    })
                                    .addOnCompleteListener(t -> imageProxy.close());
                        } catch (Exception e) {
                            imageProxy.close();
                        }
                    }
                });

                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
            } catch (Exception e) {
                Toast.makeText(this, "相机启动失败", Toast.LENGTH_SHORT).show();
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
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
