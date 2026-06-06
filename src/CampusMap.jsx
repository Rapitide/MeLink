import React, { useState, useEffect, useRef, useMemo, Suspense, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

// =====================================================================
// 🌍 キャンパス地図 (CampusMap) 関連のコンポーネント・定数
// =====================================================================

// ファイルが無い時にアプリが落ちるのを防ぐバリア
class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[100, 0.1, 100]} />
          <meshStandardMaterial color="#ff99cc" />
        </mesh>
      )
    }
    return this.props.children
  }
}

// 検索バー用アイコン
const CampusSearchIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CampusMapPinIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const CampusXIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const BUILDING_LABELS = [
  { id: 'b_2732', name: '大学会館 ローソン', position: [40, 29, -328] },
  { id: 'b_4849', name: '保健センター', position: [-10, 32, -320] },
  { id: 'b_7838', name: '第２食堂 売店', position: [-39, 32, -291] },
  { id: 'b_5904', name: '経済学部A棟', position: [4, 33, -247] },
  { id: 'b_7579', name: '経済学部B棟', position: [1, 29, -216] },
  { id: 'b_1337', name: '経済学部研究棟', position: [-33, 31, -218] },
  { id: 'b_271', name: '図書館', position: [-12, 32, -172] },
  { id: 'b_2910', name: '教育学部A棟', position: [-4, 31, -127] },
  { id: 'b_4793', name: '教育学部C棟', position: [13, 35, -105] },
  { id: 'b_4472', name: '教育学部B棟', position: [5, 32, -79] },
  { id: 'b_6666', name: '教育学部コモ棟', position: [20, 11, -40] },
  { id: 'b_99', name: '教育学部D棟', position: [-31, 32, -53] },
  { id: 'b_1576', name: '教育学部H棟', position: [-67, 32, -25] },
  { id: 'b_5770', name: '第１食堂', position: [14, 28, 11] },
  { id: 'b_6023', name: '総合体育館', position: [4, 28, 59] },
  { id: 'b_9186', name: '第１体育館', position: [-58, 33, 51] },
  { id: 'b_8424', name: '第１武道場', position: [13, 31, 102] },
  { id: 'b_3651', name: '合宿研究所', position: [-29, 22, 105] },
  { id: 'b_273', name: '国際交流会館４号館', position: [-138, 31, -10] },
  { id: 'b_7784', name: '国際交流会館１号館', position: [-196, 32, -1] },
  { id: 'b_9863', name: '国際交流会館２号館', position: [-142, 32, 28] },
  { id: 'b_366', name: '国際交流会館３号館', position: [-198, 30, 30] },
  { id: 'b_7259', name: '学生宿舎', position: [-158, 31, 128] },
  { id: 'b_6811', name: '事務局棟', position: [176, 34, -369] },
  { id: 'b_5050', name: '研究機構棟', position: [135, 30, -320] },
  { id: 'b_7372', name: '教養学部棟', position: [122, 30, -283] },
  { id: 'b_3102', name: '全学講義棟３号館', position: [186, 32, -279] },
  { id: 'b_851', name: '全学講義棟２号館', position: [228, 34, -291] },
  { id: 'b_6686', name: '全学講義棟１号館', position: [126, 32, -229] },
  { id: 'b_3694', name: '教育機構棟', position: [191, 32, -246] },
  { id: 'b_6008', name: '理学部３号館', position: [196, 36, -209] },
  { id: 'b_4460', name: '理学部講義実験棟', position: [166, 32, -192] },
  { id: 'b_5122', name: '理学部１号館', position: [207, 35, -162] },
  { id: 'b_4535', name: '理学部２号館', position: [114, 31, -165] },
  { id: 'b_949', name: '工学部情報工学科棟', position: [82, 31, -120] },
  { id: 'b_5542', name: '大学院理工学研究科棟', position: [81, 31, -97] },
  { id: 'b_2824', name: '工学部電電棟２号館', position: [111, 31, -119] },
  { id: 'b_657', name: '工学部電電棟１号館', position: [150, 28, -115] },
  { id: 'b_2123', name: '工学部講義棟', position: [198, 31, -115] },
  { id: 'b_2714', name: '情報メディア基盤センター', position: [231, 32, -103] },
  { id: 'b_5309', name: '総合研究棟１号館', position: [91, 31, -62] },
  { id: 'b_3851', name: '工学部機械工学・シスデザ棟', position: [140, 32, -66] },
  { id: 'b_5476', name: '工学部応用化学科１号館', position: [86, 33, -28] },
  { id: 'b_6333', name: '工学部応用化学科２号館', position: [139, 32, -25] },
  { id: 'b_4085', name: '工学部電電・応化棟３号館', position: [188, 28, -22] },
  { id: 'b_859', name: '工学部実習・実験棟', position: [218, 37, -1] },
  { id: 'b_9932', name: '工学部環社棟２号館', position: [105, 35, 20] },
  { id: 'b_3601', name: '工学部環社棟１号館', position: [145, 33, 21] },
  { id: 'b_2908', name: '工学部環社棟第１実験棟', position: [182, 30, 28] },
  { id: 'b_2944', name: '工学部環社棟第２実験棟', position: [217, 29, 30] },
  { id: 'b_2606', name: '工学部環社棟第３実験棟', position: [258, 28, 22] },
  { id: 'b_265', name: '工学部環社棟３号館', position: [213, 31, 66] },
  { id: 'b_7075', name: 'オーイノ研究棟', position: [85, 31, 57] },
  { id: 'b_7348', name: '課外活動共用施設', position: [67, 28, 92] },
];

function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const filteredBuildings = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return BUILDING_LABELS.filter(b => b.name.toLowerCase().includes(lowerQuery));
  }, [query]);

  return (
    <div className="absolute top-4 left-4 right-4 md:top-6 md:left-1/2 md:right-auto md:w-[92%] md:max-w-[400px] md:-translate-x-1/2 z-[1000]">
      <div className={`relative flex items-center bg-white/80 backdrop-blur-xl border shadow-lg rounded-full px-4 py-3.5 transition-all duration-300 ${isFocused ? 'border-blue-400/50 shadow-blue-500/10 bg-white/95' : 'border-white/40'}`}>
        <CampusSearchIcon className="text-slate-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          placeholder="建物や施設を検索..."
          className="w-full bg-transparent outline-none text-slate-700 placeholder-slate-400 font-medium text-[15px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            window.scrollTo(0, 0);
          }}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
            setTimeout(() => {
              window.scrollTo(0, 0);
              document.body.scrollTop = 0;
            }, 50);
            setTimeout(() => window.scrollTo(0, 0), 300);
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 rounded-full p-1 ml-2"
          >
            <CampusXIcon />
          </button>
        )}
      </div>

      <div className={`absolute top-full mt-2 w-full bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 origin-top ${isFocused && query ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
        <div className="max-h-[280px] overflow-y-auto">
          {filteredBuildings.length > 0 ? (
            <ul>
              {filteredBuildings.map((b) => (
                <li key={b.id}>
                  <button
                    className="w-full text-left px-5 py-3.5 hover:bg-blue-50 focus:bg-blue-50 flex items-center transition-colors border-b border-slate-100 last:border-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(b);
                      setQuery(b.name);
                      setIsFocused(false);
                      if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                      }
                      setTimeout(() => window.scrollTo(0, 0), 100);
                    }}
                  >
                    <span className="text-blue-500 mr-3 p-1.5 bg-blue-100 rounded-full pointer-events-none"><CampusMapPinIcon /></span>
                    <span className="text-slate-700 font-medium text-[14px] pointer-events-none">{b.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-6 text-center text-[14px] text-slate-500 font-medium">
              該当する建物が見つかりません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// モデル自体を直接青く染める処理を完全に廃止しました
function CampusModel({ onMeshClick }) {
  const { scene } = useGLTF('/saitama_v3.glb');

  // モデルの初期化（元の色を設定し、エッジを追加するのみ）
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.initialized) {
          const matName = child.material?.name?.toLowerCase() || '';
          let targetColor = '#e8eaee';
          let isBuildingPart = false;

          if (matName.includes('wall')) {
            targetColor = '#7d8597';
            isBuildingPart = true;
          } else if (matName.includes('roof')) {
            targetColor = '#9199a9';
            isBuildingPart = true;
          }

          child.material = new THREE.MeshStandardMaterial({
            color: targetColor, roughness: 1.0, metalness: 0.0, flatShading: true,
          });

          // 建物パーツのみエッジ線を描画する
          if (!child.userData.hasEdges && isBuildingPart) {
            const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 20);
            const edgesMaterial = new THREE.LineBasicMaterial({ color: '#2a2e35', linewidth: 1 });
            const line = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            child.add(line);
            child.userData.hasEdges = true;
          }
          child.userData.initialized = true;
        }
      }
    });
  }, [scene]);

  return (
    <primitive
      object={scene}
      onClick={(e) => {
        e.stopPropagation();
        if (onMeshClick) onMeshClick(e);
      }}
    />
  );
}

// 新機能：選択した建物の場所に「光の柱」と「リング」を表示するコンポーネント
function BuildingHighlight({ selectedBuilding }) {
  const highlightRef = useRef(null);
  const outerRingRef = useRef(null);

  useFrame((state, delta) => {
    if (highlightRef.current) {
      highlightRef.current.rotation.y += delta * 0.5;
      // 明滅効果
      const opacity = 0.2 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      highlightRef.current.material.opacity = opacity;
    }
    if (outerRingRef.current) {
      // 波紋のように広がる効果
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      outerRingRef.current.scale.set(scale, scale, 1);
      outerRingRef.current.material.opacity = 0.5 - Math.sin(state.clock.elapsedTime * 3) * 0.25;
    }
  });

  if (!selectedBuilding) return null;

  // 建物の高さ（ラベルのY座標）を利用して柱の高さを設定
  const height = selectedBuilding.position[1];
  // グループの原点を地面（Y=0）に配置
  const pos = [selectedBuilding.position[0], 0, selectedBuilding.position[2]];

  return (
    <group position={pos}>
      {/* 光の柱（シリンダー） */}
      {/* 中心のY座標を height / 2 にすることで、底が地面に、上が建物の屋根付近になる */}
      <mesh ref={highlightRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[25, 25, height, 32, 1, true]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 足元の固定リング */}
      <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[22, 26, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>

      {/* 足元の波紋リング */}
      <mesh ref={outerRingRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[27, 29, 32]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function CameraMover({ targetPosition, orbitRef, onMoveEnd }) {
  const { camera } = useThree();
  const isMoving = useRef(false);
  const targetCamPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!targetPosition || !orbitRef.current) return;

    const offset = new THREE.Vector3().subVectors(camera.position, orbitRef.current.target);
    let dist = offset.length();
    if (dist < 1) offset.set(200, 150, 200);
    const minDist = 200;
    const maxDist = 900;
    dist = THREE.MathUtils.clamp(dist, minDist, maxDist);
    offset.normalize().multiplyScalar(dist);

    targetLookAt.current.set(...targetPosition);
    targetCamPos.current.copy(targetLookAt.current).add(offset);
    isMoving.current = true;
  }, [targetPosition, camera, orbitRef]);

  useFrame(() => {
    if (!isMoving.current) return;

    camera.position.lerp(targetCamPos.current, 0.04);
    if (orbitRef.current) {
      orbitRef.current.target.lerp(targetLookAt.current, 0.04);
      orbitRef.current.update();
    }

    if (
      camera.position.distanceTo(targetCamPos.current) < 3.0 &&
      orbitRef.current?.target.distanceTo(targetLookAt.current) < 3.0
    ) {
      isMoving.current = false;
      if (onMoveEnd) onMoveEnd();
    }
  });

  useEffect(() => {
    const cancelMove = () => { isMoving.current = false; };
    window.addEventListener('pointerdown', cancelMove);
    return () => window.removeEventListener('pointerdown', cancelMove);
  }, []);

  return null;
}

// 選択された建物のみを表示するコンポーネント
function BuildingPins({ selectedBuilding }) {
  if (!selectedBuilding) return null;

  return (
    <Html position={selectedBuilding.position} center zIndexRange={[100, 0]}>
      <div
        className="flex flex-col items-center select-none pointer-events-none"
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}
      >
        <div className="bg-blue-600/95 backdrop-blur-md text-slate-50 font-medium px-4 py-2 rounded-lg text-[14px] tracking-wide shadow-xl whitespace-nowrap pointer-events-none border border-blue-400/30">
          {selectedBuilding.name}
        </div>
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600/95 mx-auto -mt-[1px] drop-shadow-sm pointer-events-none"></div>
      </div>
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </Html>
  );
}

export default function CampusMapComponent({ isDark, isSidebarCollapsed }) {
  const [targetPos, setTargetPos] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const orbitRef = useRef(null);

  // --- iOS（ホーム画面追加時）のキーボードによる画面押し出しバグを防止 ---
  useEffect(() => {
    window.scrollTo(0, 0);

    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    };

    // リサイズ（キーボード開閉）が発生したら強制的に位置を戻す (スクロール監視はタップキャンセル防止のため廃止)
    window.addEventListener('resize', resetScroll);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resetScroll);
    }

    return () => {
      window.removeEventListener('resize', resetScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', resetScroll);
      }
    };
  }, []);

  

  // マップ上の3Dモデルがタップ（クリック）されたときの処理
  const handleMeshClick = (e) => {
    const clickPos = e.point;
    let nearestBuilding = null;
    let minDist = Infinity;

    // クリック地点に最も近い建物を探す
    BUILDING_LABELS.forEach(b => {
      const bPos = new THREE.Vector3(b.position[0], 0, b.position[2]);
      const cPos = new THREE.Vector3(clickPos.x, 0, clickPos.z);
      const dist = bPos.distanceTo(cPos);
      if (dist < minDist) {
        minDist = dist;
        nearestBuilding = b;
      }
    });

    // 距離が一定以内（建物をタップしたとみなせる範囲）であれば選択状態にする
    if (minDist < 40) {
      setSelectedBuilding(nearestBuilding);
      setTargetPos(nearestBuilding.position);
    } else {
      setSelectedBuilding(null);
    }
  };

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setTargetPos(building.position);
  };

  return (
    <div className={`fixed inset-x-0 top-0 mx-auto w-full lg:w-auto lg:max-w-none lg:right-0 touch-none overflow-hidden z-0 border-x border-gray-800 ${isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'} bottom-[60px] lg:bottom-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`} style={{ background: '#f4f6f8' }}>
      <SearchBar onSelect={handleBuildingSelect} />
      <Canvas
        camera={{ position: [300, 300, 300], fov: 45, far: 5000 }}
        onPointerMissed={() => setSelectedBuilding(null)}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[100, 200, 50]} intensity={0.5} />
        <Environment preset="city" environmentIntensity={0.3} />
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <CampusModel onMeshClick={handleMeshClick} />
            <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={2000} blur={1.5} far={100} />
            <BuildingHighlight selectedBuilding={selectedBuilding} />
            <BuildingPins selectedBuilding={selectedBuilding} />
            <CameraMover targetPosition={targetPos} orbitRef={orbitRef} onMoveEnd={() => setTargetPos(null)} />
          </Suspense>
        </ModelErrorBoundary>
        <OrbitControls ref={orbitRef} makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={180} maxDistance={1500} />
      </Canvas>

      
    </div>
  );
}