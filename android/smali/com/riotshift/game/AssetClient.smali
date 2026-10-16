# Serves files from the APK's assets/ folder for https://appassets.androidplatform.net/*
# (same idea as androidx WebViewAssetLoader). Other hosts go to the network.
.class public Lcom/riotshift/game/AssetClient;
.super Landroid/webkit/WebViewClient;

.field private final assets:Landroid/content/res/AssetManager;

.method public constructor <init>(Landroid/content/res/AssetManager;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    iput-object p1, p0, Lcom/riotshift/game/AssetClient;->assets:Landroid/content/res/AssetManager;
    return-void
.end method

.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .registers 8
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v1
    const-string v2, "appassets.androidplatform.net"
    invoke-virtual {v2, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :pass

    invoke-virtual {v0}, Landroid/net/Uri;->getPath()Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :pass
    const/4 v1, 0x1
    invoke-virtual {v0, v1}, Ljava/lang/String;->substring(I)Ljava/lang/String;
    move-result-object v0
    invoke-static {v0}, Lcom/riotshift/game/AssetClient;->mimeFor(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1

    :try_start
    iget-object v2, p0, Lcom/riotshift/game/AssetClient;->assets:Landroid/content/res/AssetManager;
    invoke-virtual {v2, v0}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v2
    :try_end
    .catch Ljava/io/IOException; {:try_start .. :try_end} :pass

    new-instance v3, Landroid/webkit/WebResourceResponse;
    const-string v4, "UTF-8"
    invoke-direct {v3, v1, v4, v2}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V
    return-object v3

    :pass
    const/4 v0, 0x0
    return-object v0
.end method

.method private static mimeFor(Ljava/lang/String;)Ljava/lang/String;
    .registers 3
    const-string v0, ".html"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next0
    const-string v0, "text/html"
    return-object v0
    :next0
    const-string v0, ".js"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next1
    const-string v0, "text/javascript"
    return-object v0
    :next1
    const-string v0, ".mjs"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next2
    const-string v0, "text/javascript"
    return-object v0
    :next2
    const-string v0, ".css"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next3
    const-string v0, "text/css"
    return-object v0
    :next3
    const-string v0, ".json"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next4
    const-string v0, "application/json"
    return-object v0
    :next4
    const-string v0, ".png"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next5
    const-string v0, "image/png"
    return-object v0
    :next5
    const-string v0, ".jpg"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next6
    const-string v0, "image/jpeg"
    return-object v0
    :next6
    const-string v0, ".jpeg"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next7
    const-string v0, "image/jpeg"
    return-object v0
    :next7
    const-string v0, ".webp"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next8
    const-string v0, "image/webp"
    return-object v0
    :next8
    const-string v0, ".svg"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next9
    const-string v0, "image/svg+xml"
    return-object v0
    :next9
    const-string v0, ".glb"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next10
    const-string v0, "model/gltf-binary"
    return-object v0
    :next10
    const-string v0, ".gltf"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next11
    const-string v0, "model/gltf+json"
    return-object v0
    :next11
    const-string v0, ".bin"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next12
    const-string v0, "application/octet-stream"
    return-object v0
    :next12
    const-string v0, ".ktx2"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next13
    const-string v0, "image/ktx2"
    return-object v0
    :next13
    const-string v0, ".wav"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next14
    const-string v0, "audio/wav"
    return-object v0
    :next14
    const-string v0, ".mp3"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next15
    const-string v0, "audio/mpeg"
    return-object v0
    :next15
    const-string v0, ".ogg"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next16
    const-string v0, "audio/ogg"
    return-object v0
    :next16
    const-string v0, ".woff2"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next17
    const-string v0, "font/woff2"
    return-object v0
    :next17
    const-string v0, ".txt"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :next18
    const-string v0, "text/plain"
    return-object v0
    :next18
    const-string v0, "application/octet-stream"
    return-object v0
.end method
