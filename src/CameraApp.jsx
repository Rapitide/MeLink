import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Camera, AlertCircle, Share2, Download, RotateCw, ZoomIn } from 'lucide-react';

const CameraApp = ({ onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (背面) or 'user' (前面)
  const [isFlashing, setIsFlashing] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ズーム倍率 (1.0x, 2.0x, 3.0x) - ハードウェア依存せず全端末で動くデジタルズーム
  const [zoomScale, setZoomScale] = useState(1.0);

  // 撮影後のプレビュー/保存用モーダル制御
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // デバイスの回転角 (UIアイコンの向きを補正するため)
  const [deviceRotation, setDeviceRotation] = useState(0);

  // デバイスの回転を検知してUIのアイコン角度を設定
  useEffect(() => {
    const handleOrientation = () => {
      const orient = window.orientation !== undefined 
        ? window.orientation 
        : (screen.orientation ? screen.orientation.angle : 0);
      
      // デバイスが傾いた方向と逆方向にアイコンを回転させ、常に直立させます
      let angle = 0;
      if (orient === 90) angle = -90;
      else if (orient === -90 || orient === 270) angle = 90;
      else if (orient === 180) angle = 180;
      setDeviceRotation(angle);
    };

    window.addEventListener('orientationchange', handleOrientation);
    window.addEventListener('resize', handleOrientation);
    handleOrientation();

    return () => {
      window.removeEventListener('orientationchange', handleOrientation);
      window.removeEventListener('resize', handleOrientation);
    };
  }, []);

  // カメラストリームの開始 (高画質優先)
  const startCamera = async (mode) => {
    setLoading(true);
    setError(null);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // 画質が荒い問題を根本解決するため、理想値(ideal)に4KやFHDの値を明示設定。
    // かつ、デバイス側が非対応の場合の起動失敗を防ぐため、最小解像度(min)を伴う安全なフォールバックチェーンを実装。
    const constraintsList = [
      // 1. 4K解像度を理想とし、高精細なセンサー能力を引き出す (背面メインカメラなど)
      {
        video: {
          facingMode: { ideal: mode },
          width: { min: 1920, ideal: 3840 },
          height: { min: 1080, ideal: 2160 }
        },
        audio: false
      },
      // 2. フルHD (1080p) - バランスの良い高画質
      {
        video: {
          facingMode: { ideal: mode },
          width: { min: 1280, ideal: 1920 },
          height: { min: 720, ideal: 1080 }
        },
        audio: false
      },
      // 3. HD (720p) - 古いスマホやインカメラ向け
      {
        video: {
          facingMode: { ideal: mode },
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 }
        },
        audio: false
      },
      // 4. 最低限 (起動優先)
      {
        video: {
          facingMode: { ideal: mode }
        },
        audio: false
      }
    ];

    let newStream = null;
    let success = false;
    let lastError = null;

    for (const constraints of constraintsList) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
        success = true;
        break; // 起動に成功したらループを抜ける
      } catch (err) {
        console.warn("Failed with constraints:", constraints, err);
        lastError = err;
      }
    }

    if (success && newStream) {
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } else {
      console.error("Camera access failed all attempts:", lastError);
      setError("カメラの起動に失敗しました。スマホの設定でブラウザのカメラアクセス権限が許可されているかご確認ください。");
    }
    setLoading(false);
  };

  useEffect(() => {
    // プレビュー表示中のみカメラを起動
    if (!capturedImage) {
      startCamera(facingMode);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, capturedImage]);

  // 前面/背面カメラ切り替え
  const toggleCamera = () => {
    if (loading || capturedImage) return;
    setZoomScale(1.0); // カメラ切り替え時はズームをリセット
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // ズーム切り替え (1x -> 2x -> 3x -> 1x)
  const toggleZoom = () => {
    setZoomScale(prev => {
      if (prev === 1.0) return 2.0;
      if (prev === 2.0) return 3.0;
      return 1.0;
    });
  };

  // 写真の撮影処理
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || loading || error) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // ビデオの実際の解像度
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // 現在のデバイスの画面の向き (0, 90, -90, 180)
    let orient = window.orientation !== undefined 
      ? window.orientation 
      : (screen.orientation ? screen.orientation.angle : 0);

    // 縦横の検知バグ対策 (比率から画面の向きを判定)
    const isPortrait = window.innerHeight > window.innerWidth;
    if (orient === 0 && !isPortrait) {
      orient = 90;
    }

    const isLandscape = orient === 90 || orient === -90 || orient === 270;
    const isVideoLandscape = videoWidth > videoHeight;

    // Canvas の解像度を設定 (FHD等のアスペクト比を維持)
    if (isLandscape) {
      canvas.width = Math.max(videoWidth, videoHeight);
      canvas.height = Math.min(videoWidth, videoHeight);
    } else {
      canvas.width = Math.min(videoWidth, videoHeight);
      canvas.height = Math.max(videoWidth, videoHeight);
    }

    // 基準点を Canvas の中心へ移動
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // 回転角の計算
    let rotateRad = 0;

    if (orient === 0) {
      if (isVideoLandscape) {
        rotateRad = Math.PI / 2;
      }
    } else if (orient === 90) {
      if (!isVideoLandscape) {
        rotateRad = -Math.PI / 2;
      }
    } else if (orient === -90 || orient === 270) {
      if (!isVideoLandscape) {
        rotateRad = Math.PI / 2;
      } else {
        rotateRad = Math.PI;
      }
    } else if (orient === 180) {
      rotateRad = Math.PI;
      if (isVideoLandscape) {
        rotateRad = -Math.PI / 2;
      }
    }
    
    ctx.rotate(rotateRad);

    // インカメラ（user）の場合は鏡像反転を適用
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
    }

    // デジタルズームに応じたビデオフレームのクロップ（切り抜き）計算
    // zoomScaleが1.0より大きい時、ビデオの中心部分を縮小して切り取り、Canvasへ等倍描画することでズーム処理を実現
    const sw = videoWidth / zoomScale;
    const sh = videoHeight / zoomScale;
    const sx = (videoWidth - sw) / 2;
    const sy = (videoHeight - sh) / 2;

    // クロップ描画 (ズームが適用された状態で写真を切り出し)
    ctx.drawImage(video, sx, sy, sw, sh, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);

    // 描画設定をリセット
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 高精細なデータURLを取得 (画質を低下させない)
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    setCapturedImage(dataUrl);

    // フラッシュエフェクトを発火
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 200);

    // ストリームを停止
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // ファイルへの自動保存
  const saveToFiles = () => {
    if (!capturedImage) return;
    
    const a = document.createElement('a');
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    
    a.href = capturedImage;
    a.download = `MeLink_${dateStr}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Web Share API を使用したカメラロール保存
  const saveToPhotosApp = async () => {
    if (!capturedImage || isSaving) return;
    setIsSaving(true);

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const file = new File([blob], "MeLink_Photo.png", { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'MeLinkで撮影した写真',
          text: 'カメラロール（写真アプリ）に保存するには、「画像を保存」を選択してください。'
        });
      } else {
        saveToFiles();
        alert("ブラウザの共有機能が利用できません。画像を長押しして「写真に追加」するか、「ファイルに保存」を行ってください。");
      }
    } catch (err) {
      console.error("Failed to share/save photo:", err);
      saveToFiles();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col justify-between select-none">
      
      {/* 非表示のキャンバス */}
      <canvas ref={canvasRef} className="hidden" />

      {/* フラッシュエフェクト */}
      <div 
        className={`absolute inset-0 bg-white transition-opacity pointer-events-none duration-150 z-50 ${
          isFlashing ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* ── 撮影プレビュー表示中 ── */}
      {!capturedImage && (
        <>
          {/* 1. 上部ツールバー */}
          <div className="h-16 px-4 flex items-center justify-between z-10 bg-black/70 backdrop-blur-md border-b border-zinc-800/50">
            <button 
              onClick={onClose} 
              style={{ transform: `rotate(${deviceRotation}deg)` }}
              className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all duration-300 active:scale-95"
              title="閉じる"
            >
              <X size={20} />
            </button>
            <span className="text-zinc-200 font-bold text-sm tracking-widest">無音カメラ</span>
            <div className="w-10"></div>
          </div>

          {/* 2. カメラビューアエリア */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950">
            {/* videoコンテナのサイズ制限と、ズーム倍率をCSS scaleで反映 */}
            <div className="w-full h-full max-h-[75vh] md:max-w-md md:rounded-2xl overflow-hidden relative flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  transform: `scale(${zoomScale}) ${facingMode === 'user' ? 'scaleX(-1)' : ''}`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="w-full h-full object-cover bg-black"
              />
            </div>

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30 space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-400 text-xs">カメラを起動中...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 z-30 p-6 text-center space-y-4">
                <AlertCircle className="text-red-500" size={40} />
                <p className="text-zinc-200 text-sm font-bold max-w-xs">{error}</p>
                <button 
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors active:scale-95"
                >
                  カメラを再起動
                </button>
              </div>
            )}
          </div>

          {/* 3. 下部コントロールバー */}
          <div className="h-32 px-8 flex items-center justify-between z-10 bg-black/80 backdrop-blur-md border-t border-zinc-800/50 pb-safe">
            {/* 左：切り替え */}
            <div className="w-14 flex justify-center">
              <button
                onClick={toggleCamera}
                disabled={loading || !!error}
                style={{ transform: `rotate(${deviceRotation}deg)` }}
                className="p-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all duration-300 active:scale-90 disabled:opacity-50"
                title="イン/アウトカメラ切り替え"
              >
                <RefreshCw size={22} />
              </button>
            </div>

            {/* 中央：シャッター */}
            <div className="flex items-center justify-center">
              <button
                onClick={takePhoto}
                disabled={loading || !!error}
                className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white bg-transparent active:scale-90 transition-transform duration-150 disabled:opacity-50"
                title="撮影"
              >
                <span className="w-16 h-16 rounded-full bg-white group-hover:scale-95 group-active:scale-85 transition-transform duration-150" />
              </button>
            </div>

            {/* 右：ズーム切り替えボタン (1x, 2x, 3x) */}
            <div className="w-14 flex justify-center">
              <button
                onClick={toggleZoom}
                disabled={loading || !!error}
                style={{ transform: `rotate(${deviceRotation}deg)` }}
                className="w-12 h-12 flex flex-col items-center justify-center rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700/50 font-black text-xs transition-all active:scale-90 disabled:opacity-50"
                title="ズーム倍率変更"
              >
                <span className="text-[10px] tracking-tight">{zoomScale.toFixed(1)}x</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 撮影完了・保存確認画面 ── */}
      {capturedImage && (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col justify-between">
          
          {/* 上部バー */}
          <div className="h-16 px-4 flex items-center justify-between bg-black/70 backdrop-blur-md border-b border-zinc-800/50">
            <button 
              onClick={() => setCapturedImage(null)} 
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-bold transition-colors active:scale-95"
            >
              閉じる
            </button>
            <span className="text-zinc-200 font-bold text-sm tracking-widest">写真を確認</span>
            <div className="w-16"></div>
          </div>

          {/* 中央プレビュー (長押しして写真アプリに保存できるようimgタグで表示) */}
          <div className="flex-1 relative flex flex-col items-center justify-center bg-black p-4">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="max-h-[60vh] object-contain rounded-xl border border-zinc-850 shadow-2xl select-text" 
              style={{ WebkitTouchCallout: 'default' }} // iOSの長押し保存メニューを強制有効化
            />
            
            {/* iOS/Androidユーザー向けの操作ガイド */}
            <div className="mt-4 max-w-xs text-center px-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium bg-zinc-900/60 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-zinc-800">
                💡 <span className="text-white font-bold">写真アプリ（カメラロール）に保存するには</span><br />
                上の画像を<span className="text-emerald-400 font-bold">長押し</span>して<span className="text-emerald-400 font-bold">「\"写真\"に追加」</span>を選択するか、下の「画像を保存」ボタンを押してください。
              </p>
            </div>
          </div>

          {/* 下部アクションバー */}
          <div className="h-32 px-6 flex flex-col justify-center items-center bg-black/80 backdrop-blur-md border-t border-zinc-800/50 space-y-3 pb-safe">
            <div className="flex space-x-4 w-full max-w-sm justify-center">
              
              {/* 再撮影 */}
              <button
                onClick={() => setCapturedImage(null)}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold rounded-2xl border border-zinc-800 text-xs transition-colors active:scale-95"
              >
                <RotateCw size={14} />
                <span>もう一度撮る</span>
              </button>

              {/* 画像を保存 (Web Share API を起動し、標準の「画像を保存」を選択させる) */}
              <button
                onClick={saveToPhotosApp}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition-colors active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Share2 size={14} />
                )}
                <span>画像を保存する</span>
              </button>

            </div>

            {/* パソコンやフォールバック用：ファイルに直接保存 */}
            <button
              onClick={saveToFiles}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center space-x-1 underline transition-colors"
            >
              <Download size={10} />
              <span>ファイルとしてダウンロードする</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default CameraApp;
