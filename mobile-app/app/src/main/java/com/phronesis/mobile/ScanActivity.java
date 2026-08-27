package com.phronesis.mobile;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.util.SparseArray;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.Result;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import android.hardware.Camera;

public class ScanActivity extends AppCompatActivity {
    private static final String TAG = "ScanActivity";
    private static final int CAMERA_PERMISSION_REQUEST = 1001;
    
    private SurfaceView surfaceView;
    private TextView scanText;
    private Button flashlightBtn;
    private Camera camera;
    private boolean isFlashOn = false;
    private boolean isScanning = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 全屏
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        setContentView(R.layout.activity_scan);
        
        // 初始化视图
        surfaceView = findViewById(R.id.surfaceView);
        scanText = findViewById(R.id.scanText);
        flashlightBtn = findViewById(R.id.flashlightBtn);
        
        // 返回按钮
        findViewById(R.id.backBtn).setOnClickListener(v -> finish());
        
        // 闪光灯按钮
        flashlightBtn.setOnClickListener(v -> toggleFlashlight());
        
        // 手动输入按钮
        findViewById(R.id.manualInputBtn).setOnClickListener(v -> showManualInput());
        
        // 检查相机权限
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.CAMERA},
                CAMERA_PERMISSION_REQUEST);
        } else {
            startCamera();
        }
    }

    private void startCamera() {
        surfaceView.getHolder().addCallback(new SurfaceHolder.Callback() {
            @Override
            public void surfaceCreated(SurfaceHolder holder) {
                openCamera(holder);
            }

            @Override
            public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
                // 相机预览大小改变时的处理
            }

            @Override
            public void surfaceDestroyed(SurfaceHolder holder) {
                releaseCamera();
            }
        });
    }

    private void openCamera(SurfaceHolder holder) {
        try {
            camera = Camera.open();
            camera.setPreviewDisplay(holder);
            camera.setDisplayOrientation(90);
            
            // 设置自动对焦
            Camera.Parameters params = camera.getParameters();
            if (params.getSupportedFocusModes().contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE)) {
                params.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE);
            }
            camera.setParameters(params);
            
            camera.startPreview();
            
            // 开始扫描
            startScanning();
        } catch (IOException e) {
            Log.e(TAG, "无法打开相机", e);
            Toast.makeText(this, "无法打开相机", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    private void startScanning() {
        // 简单的二维码扫描实现
        // 在实际项目中，建议使用 CameraX + ML Kit 进行更准确的扫描
        new Thread(() -> {
            while (isScanning && camera != null) {
                try {
                    camera.autoFocus((success, camera) -> {
                        if (success) {
                            // 对焦成功，可以进行扫描
                            // 这里简化处理，实际应该使用图像分析
                        }
                    });
                    Thread.sleep(1000);
                } catch (Exception e) {
                    break;
                }
            }
        }).start();
    }

    private void releaseCamera() {
        if (camera != null) {
            camera.stopPreview();
            camera.release();
            camera = null;
        }
    }

    private void toggleFlashlight() {
        if (camera == null) return;
        
        Camera.Parameters params = camera.getParameters();
        if (isFlashOn) {
            params.setFlashMode(Camera.Parameters.FLASH_MODE_OFF);
            flashlightBtn.setText("开启闪光灯");
        } else {
            params.setFlashMode(Camera.Parameters.FLASH_MODE_TORCH);
            flashlightBtn.setText("关闭闪光灯");
        }
        camera.setParameters(params);
        isFlashOn = !isFlashOn;
    }

    private void showManualInput() {
        // 显示手动输入对话框
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
        builder.setTitle("输入服务器地址");
        
        final android.widget.EditText input = new android.widget.EditText(this);
        input.setHint("例如: http://192.168.1.100:17918");
        input.setText("http://");
        builder.setView(input);
        
        builder.setPositiveButton("连接", (dialog, which) -> {
            String url = input.getText().toString().trim();
            if (!url.isEmpty()) {
                Intent resultIntent = new Intent();
                resultIntent.putExtra("qr_result", url);
                setResult(RESULT_OK, resultIntent);
                finish();
            }
        });
        
        builder.setNegativeButton("取消", null);
        builder.show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "需要相机权限来扫描二维码", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        releaseCamera();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (camera == null && ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
                == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        }
    }

    @Override
    protected void onDestroy() {
        releaseCamera();
        super.onDestroy();
    }
}
