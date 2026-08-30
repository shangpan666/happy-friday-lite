# 保留 Flutter 嵌入层（含 FlutterApplication / FlutterActivity / FlutterFragment 等）
# 即便开启 R8 收缩也不要移除，否则会 ClassNotFoundException 闪退。
-keep class io.flutter.embedding.android.** { *; }
-keep class io.flutter.embedding.engine.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
