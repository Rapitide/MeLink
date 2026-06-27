import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Camera, AlertCircle, Share2, Download, RotateCw } from 'lucide-react';

const CameraApp = ({ onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (背面) or 'user' (前面)
  const [isFlashing, setIsFlashing] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
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

  // カメラストリームの開始
  const startCamera = async (mode) => {
    setLoading(true);
    setError(null);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: mode }
        },
        audio: false // 音声不要 (無音化)
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("カメラの起動に失敗しました。スマホの設定でブラウザのカメラアクセス権限が許可されているかご確認ください。");
    } finally {
      setLoading(false);
    }
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
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
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
    const orient = window.orientation !== undefined 
      ? window.orientation 
      : (screen.orientation ? screen.orientation.angle : 0);

    // デバイスの向きに応じて、保存される写真の天地（向き）が正しくなるようにCanvasサイズと回転を調整
    // 横向き撮影時に写真が横倒しになるのを防ぎます
    const isLandscape = orient === 90 || orient === -90 || orient === 270;
    
    // 通常のビデオのサイズ (インカメラ/アウトカメラはブラウザ側で解像度が入れ替わる場合がある)
    const isVideoLandscape = videoWidth > videoHeight;

    // 最終的な画像サイズを設定 (デバイスが横向きかつビデオが縦長で送られてきている場合は、幅と高さを反転)
    if (isLandscape && !isVideoLandscape) {
      canvas.width = videoHeight;
      canvas.height = videoWidth;
    } else if (!isLandscape && isVideoLandscape) {
      canvas.width = videoHeight;
      canvas.height = videoWidth;
    } else {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    // 描画の基準点を中心に移動
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // デバイスの回転角に基づいて Canvas を回転
    let rotateRad = 0;
    if (orient === 90) {
      rotateRad = -Math.PI / 2; // -90度
    } else if (orient === -90 || orient === 270) {
      rotateRad = Math.PI / 2;  // 90度
    } else if (orient === 180) {
      rotateRad = Math.PI;       // 180度
    }
    ctx.rotate(rotateRad);

    // インカメラ（user）の場合は鏡像反転を適用（鏡の見た目のまま保存）
    // 回転の後にスケールを適用することで、自撮り時の左右反転が直感的な方向になります
    if (facingMode === 'user') {
      // 縦持ち・横持ちによって反転させる軸が変わる
      if (isLandscape) {
        ctx.scale(1, -1); // 横持ち時は上下（カメラロール的には左右）反転
      } else {
        ctx.scale(-1, 1); // 縦持ち時は左右反転
      }
    }

    // Canvas の中心からビデオを描画
    // 回転したコンテキストに対して、元のビデオサイズで描画します
    ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);

    // 描画設定をリセット
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // サムネイル・プレビュー表示用にデータURLを取得
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);

    // フラッシュエフェクトを発火
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 200);

    // ストリームを一旦停止してカメラを休ませる
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // ファイル（ダウンロードフォルダ）への自動保存 (フォールバック用)
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

  // Web Share API を使用して、iOS/Android の「共有シート」から「画像を保存（カメラロールへ追加）」を実行
  const saveToPhotosApp = async () => {
    if (!capturedImage || isSaving) return;
    setIsSaving(true);

    try {
      // Data URL から Blob を生成
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const file = new File([blob], "MeLink_Photo.png", { type: "image/png" });
      
      // シェア機能が利用可能かチェック
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'MeLinkで撮影した写真',
          text: 'カメラロール（写真アプリ）に保存するには、「画像を保存」を選択してください。'
        });
      } else {
        // 非対応ブラウザの場合はダウンロードを実行し、長押しを促す
        saveToFiles();
        alert("ブラウザの共有機能が利用できません。画像を長押しして「写真に追加」するか、「ファイルに保存」を行ってください。");
      }
    } catch (err) {
      console.error("Failed to share/save photo:", err);
      // エラー時のフォールバックとしてダウンロード実行
      saveToFiles();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col justify-between select-none">
      
      {/* 非表示のキャンバス (画像処理・回転処理用) */}
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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              className="w-full h-full max-h-[75vh] object-cover bg-black md:max-w-md md:rounded-2xl transition-transform duration-200"
            />

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

            {/* 右：ダミースペース */}
            <div className="w-14"></div>
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
                上の画像を<span className="text-emerald-400 font-bold">長押し</span>して<span className="text-emerald-400 font-bold">「"写真"に追加」</span>を選択するか、下の「画像を保存」ボタンを押してください。
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
