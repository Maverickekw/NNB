# Full-screen WebView host. The game is served from the APK's assets/ folder
# at https://appassets.androidplatform.net/ (see AssetClient), so ES modules,
# fetch() and glTF loading work exactly as on a web server, fully offline.
.class public Lcom/riotshift/game/MainActivity;
.super Landroid/app/Activity;

.field private web:Landroid/webkit/WebView;

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 6
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # Allow chrome://inspect debugging of the game.
    const/4 v0, 0x1
    invoke-static {v0}, Landroid/webkit/WebView;->setWebContentsDebuggingEnabled(Z)V

    new-instance v1, Landroid/webkit/WebView;
    invoke-direct {v1, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v1, p0, Lcom/riotshift/game/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v1}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v2
    invoke-virtual {v2, v0}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v2, v0}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    const/4 v3, 0x0
    invoke-virtual {v2, v3}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    new-instance v2, Lcom/riotshift/game/AssetClient;
    invoke-virtual {p0}, Lcom/riotshift/game/MainActivity;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v3
    invoke-direct {v2, v3}, Lcom/riotshift/game/AssetClient;-><init>(Landroid/content/res/AssetManager;)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    # 0xFF0B0B12 (game background) as a signed int
    const v3, -0xf4f4ee
    invoke-virtual {v1, v3}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {p0, v1}, Lcom/riotshift/game/MainActivity;->setContentView(Landroid/view/View;)V

    const-string v2, "https://appassets.androidplatform.net/index.html"
    invoke-virtual {v1, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method

.method protected onResume()V
    .registers 2
    invoke-super {p0}, Landroid/app/Activity;->onResume()V
    iget-object v0, p0, Lcom/riotshift/game/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :done
    invoke-virtual {v0}, Landroid/webkit/WebView;->onResume()V
    :done
    invoke-direct {p0}, Lcom/riotshift/game/MainActivity;->immersive()V
    return-void
.end method

.method protected onPause()V
    .registers 2
    iget-object v0, p0, Lcom/riotshift/game/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :done
    invoke-virtual {v0}, Landroid/webkit/WebView;->onPause()V
    :done
    invoke-super {p0}, Landroid/app/Activity;->onPause()V
    return-void
.end method

.method public onWindowFocusChanged(Z)V
    .registers 2
    invoke-super {p0, p1}, Landroid/app/Activity;->onWindowFocusChanged(Z)V
    if-eqz p1, :done
    invoke-direct {p0}, Lcom/riotshift/game/MainActivity;->immersive()V
    :done
    return-void
.end method

# Hide status + navigation bars (sticky immersive).
.method private immersive()V
    .registers 3
    invoke-virtual {p0}, Lcom/riotshift/game/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;
    move-result-object v0
    # IMMERSIVE_STICKY | LAYOUT_FULLSCREEN | LAYOUT_HIDE_NAVIGATION | LAYOUT_STABLE | FULLSCREEN | HIDE_NAVIGATION
    const/16 v1, 0x1706
    invoke-virtual {v0, v1}, Landroid/view/View;->setSystemUiVisibility(I)V
    return-void
.end method
