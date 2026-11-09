import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  View,
  Alert,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import MapView, { Marker, MapPressEvent, MarkerDragStartEndEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ReportDraft } from '../../types';
import {
  VN_PROVINCES_2025,
  Province2025,
  getWardsForProvince2025,
  findProvince2025ByName,
  formatStandardAddress,
  formatWardName,
  formatProvinceName,
  detectProvinceFromCoords,
  removeVietnameseTones,
} from '../../constants/vnProvinces2025';

type Mode =
  | 'idle'
  | 'gps-loading'
  | 'gps-done'
  | 'map-picking'
  | 'map-loading'
  | 'map-done'
  | 'manual-input'
  | 'manual-done';

interface Props {
  navigate: (s: string) => void;
  goBack: () => void;
  draft: ReportDraft;
  setDraft: (d: ReportDraft) => void;
}

const DEFAULT_REGION = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export default function LocationScreen({ navigate, goBack, draft, setDraft }: Props) {
  const mapRef = useRef<MapView | null>(null);

  const getInitialMode = (): Mode => {
    if (draft.locationMethod === 'AUTO_GPS') return 'gps-done';
    if (draft.locationSource === 'MAP') return 'map-done';
    if (draft.locationMethod === 'MANUAL_ENTRY') return 'manual-done';
    return 'idle';
  };

  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [locationConfirmed, setLocationConfirmed] = useState(draft.location !== null);
  const [manualText, setManualText] = useState(draft.address || '');
  const [manualError, setManualError] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // State nhập thủ công nâng cao: Chọn TP., Chọn P. và tự gõ số nhà / tên đường
  const [manualProvince, setManualProvince] = useState<string>('TP. Hồ Chí Minh');
  const [manualWard, setManualWard] = useState<string>('');
  const [manualStreet, setManualStreet] = useState<string>('');
  const [manualAvailableWards, setManualAvailableWards] = useState<string[]>([]);
  const [loadingManualWards, setLoadingManualWards] = useState<boolean>(false);
  const [subPickerMode, setSubPickerMode] = useState<'province' | 'ward' | null>(null);
  const [subPickerSearch, setSubPickerSearch] = useState<string>('');

  const selectedManualProvObj = useMemo<Province2025 | undefined>(
    () => findProvince2025ByName(manualProvince),
    [manualProvince]
  );

  useEffect(() => {
    let active = true;
    if (!selectedManualProvObj) {
      setManualAvailableWards([]);
      return;
    }
    setManualAvailableWards(selectedManualProvObj.defaultWards);
    setLoadingManualWards(true);
    getWardsForProvince2025(selectedManualProvObj)
      .then((wards) => {
        if (active) setManualAvailableWards(wards);
      })
      .finally(() => {
        if (active) setLoadingManualWards(false);
      });
    return () => {
      active = false;
    };
  }, [selectedManualProvObj]);

  const filteredManualProvinces = useMemo(() => {
    const q = removeVietnameseTones(subPickerSearch.trim());
    if (!q) return VN_PROVINCES_2025;
    return VN_PROVINCES_2025.filter(
      (p) =>
        removeVietnameseTones(p.name).includes(q) ||
        (p.mergedFrom && removeVietnameseTones(p.mergedFrom).includes(q))
    );
  }, [subPickerSearch]);

  const filteredManualWards = useMemo(() => {
    const q = removeVietnameseTones(subPickerSearch.trim());
    if (!q) return manualAvailableWards;
    return manualAvailableWards.filter((w) => removeVietnameseTones(w).includes(q));
  }, [manualAvailableWards, subPickerSearch]);

  const manualPreviewAddress = useMemo(() => {
    const parts = [
      manualStreet.trim(),
      manualWard.trim(),
      manualProvince.trim(),
    ].filter(Boolean);
    return formatStandardAddress(parts.join(', '));
  }, [manualStreet, manualWard, manualProvince]);

  const hasLocation =
    (mode === 'gps-done' || mode === 'manual-done' || mode === 'map-done') &&
    draft.location !== null;
  const canProceed = draft.location !== null;

  const formatReverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        await Location.requestForegroundPermissionsAsync();
      }
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const addr = results[0];

        // 1. Số nhà & Tên đường
        const namePart = addr.name && addr.name !== addr.street ? addr.name.trim() : '';
        const streetPart = (addr.street || '').trim();
        const streetFull = [namePart, streetPart]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(' ');

        // 2. Tìm Phường / Xã và Quận / Huyện từ district và subregion
        const adminCandidates = [addr.district, addr.subregion].filter(Boolean).map((s) => s!.trim());
        let wardStr = '';
        let distStr = '';

        for (const item of adminCandidates) {
          if (/^(phường|p\.)\s+/i.test(item) || /^phường\b/i.test(item)) {
            wardStr = formatWardName(item);
          } else if (/^(xã|x\.|thị trấn|tt\.)\s+/i.test(item)) {
            wardStr = item;
          } else if (/^(quận|q\.|huyện|h\.|thị xã|tx\.)\s+/i.test(item)) {
            distStr = item;
          } else if (!wardStr) {
            wardStr = formatWardName(item);
          } else if (!distStr) {
            distStr = item;
          }
        }

        if (wardStr && !/^(P\.|Xã|Thị trấn)/i.test(wardStr)) {
          wardStr = formatWardName(wardStr);
        }

        // 3. Tỉnh / Thành phố: Dùng bộ nhận diện thông minh kết hợp cả tên địa phương & tọa độ GPS -> 100% luôn có TP.
        const cityStr = detectProvinceFromCoords(latitude, longitude, addr);

        const components = [
          streetFull,
          wardStr,
          distStr,
          cityStr,
        ]
          .filter(Boolean)
          // Loại bỏ phần tử trùng lặp liên tiếp
          .filter((item, idx, arr) => arr.indexOf(item) === idx);

        let joined = components.join(', ');

        // Đảm bảo 100% địa chỉ luôn có tiền tố TP. hoặc Tỉnh
        if (!joined.includes('TP.') && !joined.includes('Tỉnh')) {
          joined = `${joined}, ${cityStr}`;
        }

        return formatStandardAddress(joined);
      }
    } catch (err) {
      console.warn('Reverse geocode warning:', err);
    }
    const fallbackCity = detectProvinceFromCoords(latitude, longitude);
    return formatStandardAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}, ${fallbackCity}`);
  };

  const animateMapTo = (latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      450
    );
  };

  const handleUseGPS = async () => {
    if (mode === 'gps-loading') return;

    try {
      setLocationConfirmed(false);
      setMode('gps-loading');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMode('idle');
        Alert.alert(
          'Yêu cầu quyền vị trí',
          'CityFix cần quyền truy cập định vị GPS để xác định chính xác địa điểm xảy ra sự cố.'
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      animateMapTo(latitude, longitude);

      const formattedAddress = await formatReverseGeocode(latitude, longitude);

      setDraft({
        ...draft,
        location: {
          lat: latitude,
          lng: longitude,
        },
        address: formattedAddress,
        locationMethod: 'AUTO_GPS',
        locationSource: 'GPS',
      });

      console.log('==============================');
      console.log('📍 LOCATION FOR SWAGGER (GPS)');
      console.log('📍 location.lat:', latitude);
      console.log('📍 location.lng:', longitude);
      console.log('📍 address:', formattedAddress);
      console.log('==============================');

      setMode('gps-done');
      setPanelCollapsed(false);
    } catch (error) {
      console.error('GPS error:', error);
      setMode('idle');
      Alert.alert(
        'Không thể định vị',
        'Không thể lấy tọa độ hiện tại. Vui lòng bật GPS hoặc chọn địa chỉ thủ công trên bản đồ.'
      );
    }
  };

  const handleStartMapPick = () => {
    setLocationConfirmed(false);
    setMode('map-picking');
  };

  const handlePickCoordinateOnMap = async (latitude: number, longitude: number) => {
    try {
      setLocationConfirmed(false);
      setMode('map-loading');

      // Cập nhật tọa độ ngay để hiển thị Marker trên bản đồ
      setDraft({
        ...draft,
        location: { lat: latitude, lng: longitude },
        address: 'Đang xác định địa chỉ...',
        locationMethod: 'MANUAL_ENTRY',
        locationSource: 'MAP',
      });

      animateMapTo(latitude, longitude);

      const formattedAddress = await formatReverseGeocode(latitude, longitude);

      setDraft({
        ...draft,
        location: { lat: latitude, lng: longitude },
        address: formattedAddress,
        locationMethod: 'MANUAL_ENTRY',
        locationSource: 'MAP',
      });

      console.log('==============================');
      console.log('📍 LOCATION FOR SWAGGER (MAP PICK)');
      console.log('📍 location.lat:', latitude);
      console.log('📍 location.lng:', longitude);
      console.log('📍 address:', formattedAddress);
      console.log('==============================');

      setMode('map-done');
      setPanelCollapsed(false);
    } catch (error) {
      console.error('Map pick error:', error);
      setMode('map-done');
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    handlePickCoordinateOnMap(latitude, longitude);
  };

  const handleMarkerDragEnd = (e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    handlePickCoordinateOnMap(latitude, longitude);
  };

  const handleOpenManual = () => {
    setLocationConfirmed(false);
    if (draft.address) {
      const parts = draft.address.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const potentialCity = parts[parts.length - 1];
        const potentialWard = parts[parts.length - 2];
        const potentialStreet = parts.slice(0, parts.length - 2).join(', ');

        const foundProv = findProvince2025ByName(potentialCity);
        if (foundProv) {
          setManualProvince(foundProv.name);
          setManualWard(formatWardName(potentialWard));
          setManualStreet(potentialStreet);
        } else {
          setManualStreet(draft.address);
        }
      } else if (parts.length === 2) {
        const potentialCity = parts[1];
        const foundProv = findProvince2025ByName(potentialCity);
        if (foundProv) {
          setManualProvince(foundProv.name);
        }
        setManualStreet(parts[0]);
      } else {
        setManualStreet(draft.address);
      }
    }
    setManualError(false);
    setSubPickerMode(null);
    setSubPickerSearch('');
    setShowManualModal(true);
  };

  const handleConfirmManual = async () => {
    if (!manualProvince.trim()) {
      Alert.alert('Chưa chọn Tỉnh / Thành phố', 'Vui lòng chọn Tỉnh / Thành phố.');
      return;
    }
    if (!manualWard.trim()) {
      Alert.alert('Chưa chọn Phường / Xã', 'Vui lòng chọn Phường / Xã.');
      return;
    }
    if (!manualStreet.trim()) {
      setManualError(true);
      Alert.alert('Chưa nhập tên đường', 'Vui lòng nhập số nhà và tên đường cụ thể.');
      return;
    }

    const finalAddress = manualPreviewAddress;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        await Location.requestForegroundPermissionsAsync();
      }

      console.log('📍 GEOCODING MANUAL ADDRESS:', finalAddress);
      // Thử geocode địa chỉ đầy đủ trước
      let results = await Location.geocodeAsync(finalAddress);

      // Nếu địa chỉ cụ thể (số nhà hẻm) không có trên bản đồ -> Fallback về Phường + Thành phố
      if (!results || results.length === 0) {
        console.log('📍 FALLBACK GEOCODING TO WARD + PROVINCE:', `${manualWard}, ${manualProvince}`);
        results = await Location.geocodeAsync(`${manualWard}, ${manualProvince}`);
      }

      // Nếu vẫn chưa có -> Fallback về Tỉnh / Thành phố
      if (!results || results.length === 0) {
        console.log('📍 FALLBACK GEOCODING TO PROVINCE:', manualProvince);
        results = await Location.geocodeAsync(manualProvince);
      }

      if (!results || results.length === 0) {
        Alert.alert(
          'Không tìm thấy tọa độ',
          'Không tìm thấy tọa độ tương ứng với khu vực này. Vui lòng kiểm tra lại hoặc chọn trực tiếp trên bản đồ.'
        );
        return;
      }

      const { latitude, longitude } = results[0];
      animateMapTo(latitude, longitude);

      setDraft({
        ...draft,
        location: {
          lat: latitude,
          lng: longitude,
        },
        address: finalAddress,
        locationMethod: 'MANUAL_ENTRY',
        locationSource: 'MANUAL',
      });

      console.log('==============================');
      console.log('📍 LOCATION FOR SWAGGER (MANUAL PICK)');
      console.log('📍 location.lat:', latitude);
      console.log('📍 location.lng:', longitude);
      console.log('📍 address:', finalAddress);
      console.log('==============================');

      setMode('manual-done');
      setShowManualModal(false);
      setPanelCollapsed(false);
    } catch (error) {
      console.error('❌ GEOCODING ERROR:', error);
      Alert.alert(
        'Không thể xác định vị trí',
        'Đã có lỗi xảy ra khi tra cứu tọa độ từ địa chỉ. Vui lòng thử lại hoặc chọn trực tiếp trên bản đồ.'
      );
    }
  };

  const handleConfirmLocation = () => {
    setLocationConfirmed(true);
  };

  const getMethodBadgeLabel = () => {
    if (mode === 'gps-done') return 'GPS TỰ ĐỘNG';
    if (mode === 'map-done' || mode === 'map-loading') return 'CHỌN TRÊN BẢN ĐỒ';
    if (mode === 'manual-done') return 'NHẬP THỦ CÔNG';
    return '';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tạo báo cáo (Bước 1/4)</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step Indicator Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: '25%' }]} />
        </View>
        <View style={styles.stepTextRow}>
          <Text style={styles.stepBadgeText}>BƯỚC 01</Text>
          <Text style={styles.stepTitleText}>VỊ TRÍ SỰ CỐ</Text>
        </View>
      </View>

      {/* Full-Screen Interactive Map Area */}
      <View style={styles.mapFullWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          showsMyLocationButton={false}
          onPress={handleMapPress}
          initialRegion={{
            latitude: draft.location?.lat ?? DEFAULT_REGION.latitude,
            longitude: draft.location?.lng ?? DEFAULT_REGION.longitude,
            latitudeDelta: DEFAULT_REGION.latitudeDelta,
            longitudeDelta: DEFAULT_REGION.longitudeDelta,
          }}
        >
          {draft.location && (
            <Marker
              coordinate={{
                latitude: draft.location.lat,
                longitude: draft.location.lng,
              }}
              draggable
              onDragEnd={handleMarkerDragEnd}
              title="Vị trí sự cố"
              description={draft.address || 'Kéo ghim hoặc chạm bản đồ để đổi vị trí'}
            />
          )}
        </MapView>

        {/* Top Floating Badges & Instructions on Map */}
        <View style={styles.mapTopOverlay} pointerEvents="box-none">
          {hasLocation ? (
            <View style={styles.methodBadge}>
              <Ionicons
                name={
                  mode === 'gps-done'
                    ? 'navigate'
                    : mode === 'map-done'
                    ? 'location'
                    : 'create'
                }
                size={12}
                color="#ea580c"
              />
              <Text style={styles.methodBadgeText}>{getMethodBadgeLabel()}</Text>
            </View>
          ) : (
            <View style={styles.mapHintPill}>
              <Ionicons name="hand-left-outline" size={14} color="#ea580c" />
              <Text style={styles.mapHintText}>
                {mode === 'map-picking'
                  ? 'Chạm vào điểm bất kỳ trên bản đồ để ghim vị trí'
                  : 'Chạm trực tiếp lên bản đồ hoặc chọn phương thức bên dưới'}
              </Text>
            </View>
          )}

          {/* Collapse/Expand Bottom Panel Toggle Button */}
          <TouchableOpacity
            style={styles.togglePanelBtn}
            onPress={() => setPanelCollapsed(!panelCollapsed)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={panelCollapsed ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#0f172a"
            />
          </TouchableOpacity>
        </View>

        {/* Floating Recenter / My Location Quick Button */}
        <TouchableOpacity
          style={[
            styles.floatingGpsFab,
            panelCollapsed ? { bottom: 96 } : { bottom: hasLocation ? 320 : 265 },
          ]}
          onPress={handleUseGPS}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={20} color="#ea580c" />
        </TouchableOpacity>

        {/* Loading Overlay */}
        {(mode === 'gps-loading' || mode === 'map-loading') && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.loadingText}>
                {mode === 'gps-loading'
                  ? 'ĐANG ĐỊNH VỊ GPS...'
                  : 'ĐANG LẤY ĐỊA CHỈ TỪ BẢN ĐỒ...'}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Floating Control Sheet */}
        <View style={styles.bottomSheet}>
          {/* Handle Bar */}
          <TouchableOpacity
            style={styles.sheetHandleArea}
            onPress={() => setPanelCollapsed(!panelCollapsed)}
            activeOpacity={0.8}
          >
            <View style={styles.sheetHandleBar} />
          </TouchableOpacity>

          {!panelCollapsed && (
            <View style={styles.sheetBody}>
              {/* Selected Address Strip */}
              {draft.location ? (
                <View style={styles.addressBox}>
                  <Ionicons
                    name="location"
                    size={18}
                    color="#f97316"
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {draft.address}
                    </Text>
                    <Text style={styles.coordSubText}>
                      {draft.location.lat.toFixed(5)}, {draft.location.lng.toFixed(5)} · Có thể chạm bản đồ để đổi
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reselectBtn}
                    onPress={() => {
                      setMode('idle');
                      setLocationConfirmed(false);
                      setDraft({
                        ...draft,
                        location: null,
                        address: '',
                        locationMethod: null,
                        locationSource: null,
                      });
                    }}
                  >
                    <Text style={styles.reselectText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 3 Location Selection Methods */}
              <View style={styles.actionsBox}>
                {/* 1. GPS Action Button */}
                <TouchableOpacity
                  style={[styles.gpsBtn, mode === 'gps-done' && styles.btnActiveOrange]}
                  onPress={handleUseGPS}
                  disabled={mode === 'gps-loading'}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate-outline" size={17} color="#ffffff" />
                  <Text style={styles.gpsBtnText}>
                    {mode === 'gps-loading'
                      ? 'ĐANG ĐỊNH VỊ...'
                      : mode === 'gps-done'
                      ? 'ĐÃ DÙNG VỊ TRÍ HIỆN TẠI (GPS)'
                      : 'DÙNG VỊ TRÍ HIỆN TẠI (GPS)'}
                  </Text>
                </TouchableOpacity>

                {/* Row with 2 Secondary Options: Pick on Map & Manual Entry */}
                <View style={styles.secondaryMethodsRow}>
                  {/* 2. Pick on Map Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.secondaryMethodBtn,
                      (mode === 'map-picking' || mode === 'map-done') &&
                        styles.secondaryMethodBtnActive,
                    ]}
                    onPress={handleStartMapPick}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="map-outline"
                      size={17}
                      color={
                        mode === 'map-picking' || mode === 'map-done'
                          ? '#ea580c'
                          : '#0f172a'
                      }
                    />
                    <Text
                      style={[
                        styles.secondaryMethodText,
                        (mode === 'map-picking' || mode === 'map-done') &&
                          styles.secondaryMethodTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {mode === 'map-done'
                        ? 'Đã ghim bản đồ'
                        : mode === 'map-picking'
                        ? 'Chạm bản đồ...'
                        : 'Chọn trên bản đồ'}
                    </Text>
                  </TouchableOpacity>

                  {/* 3. Manual Entry Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.secondaryMethodBtn,
                      mode === 'manual-done' && styles.secondaryMethodBtnActive,
                    ]}
                    onPress={handleOpenManual}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={mode === 'manual-done' ? '#ea580c' : '#0f172a'}
                    />
                    <Text
                      style={[
                        styles.secondaryMethodText,
                        mode === 'manual-done' && styles.secondaryMethodTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {mode === 'manual-done' ? 'Đã nhập tay' : 'Nhập thủ công'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Confirm Location Secondary */}
                {hasLocation && !locationConfirmed ? (
                  <TouchableOpacity
                    style={styles.confirmLocationBtn}
                    onPress={handleConfirmLocation}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle-outline" size={17} color="#ea580c" />
                    <Text style={styles.confirmLocationText}>XÁC NHẬN VỊ TRÍ NÀY</Text>
                  </TouchableOpacity>
                ) : null}

                {locationConfirmed && hasLocation ? (
                  <View style={styles.confirmedRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.confirmedText}>VỊ TRÍ ĐÃ ĐƯỢC XÁC NHẬN</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* Bottom CTA Next */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
              disabled={!canProceed}
              onPress={() => navigate('photo')}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>TIẾP THEO — ĐÍNH KÈM ẢNH</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Manual Input Modal Sheet */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (subPickerMode) {
            setSubPickerMode(null);
          } else {
            setShowManualModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, subPickerMode ? styles.modalContentPicker : null]}>
              {subPickerMode ? (
                /* Sub-picker: Danh sách Tỉnh/TP hoặc Phường/Xã */
                <View style={styles.pickerViewContainer}>
                  <View style={styles.pickerHeaderRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setSubPickerMode(null);
                        setSubPickerSearch('');
                      }}
                      style={styles.pickerBackBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-back" size={20} color="#0f172a" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerHeaderTitle}>
                        {subPickerMode === 'province'
                          ? 'Chọn Tỉnh / Thành phố'
                          : `Chọn Phường / Xã (${selectedManualProvObj?.name || manualProvince})`}
                      </Text>
                      <Text style={styles.pickerHeaderSubtitle}>
                        {subPickerMode === 'province'
                          ? '34 Đơn vị hành chính cấp tỉnh sau sáp nhập 2025'
                          : `${filteredManualWards.length} phường/xã trực thuộc`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSubPickerMode(null);
                        setSubPickerSearch('');
                      }}
                      style={styles.pickerCloseBtn}
                    >
                      <Ionicons name="close" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Bar */}
                  <View style={styles.pickerSearchBar}>
                    <Ionicons name="search-outline" size={17} color="#94a3b8" />
                    <TextInput
                      style={styles.pickerSearchInput}
                      placeholder={
                        subPickerMode === 'province'
                          ? 'Tìm Tỉnh / TP (VD: Hồ Chí Minh, Hà Nội...)'
                          : 'Tìm Phường / Xã (VD: Bến Thành, Cống Vị...)'
                      }
                      placeholderTextColor="#94a3b8"
                      value={subPickerSearch}
                      onChangeText={setSubPickerSearch}
                      autoFocus
                    />
                    {subPickerSearch ? (
                      <TouchableOpacity onPress={() => setSubPickerSearch('')}>
                        <Ionicons name="close-circle" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* List items */}
                  {subPickerMode === 'province' ? (
                    <FlatList
                      data={filteredManualProvinces}
                      keyExtractor={(item) => item.code.toString()}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.pickerListContent}
                      renderItem={({ item }) => {
                        const isSelected = item.name === manualProvince;
                        const isCity = item.name.startsWith('TP.');
                        return (
                          <TouchableOpacity
                            style={[
                              styles.pickerItemRow,
                              isSelected && styles.pickerItemRowSelected,
                            ]}
                            onPress={() => {
                              setManualProvince(item.name);
                              setManualWard('');
                              setSubPickerMode(null);
                              setSubPickerSearch('');
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.pickerItemIconWrap}>
                              <Ionicons
                                name={isCity ? 'business-outline' : 'map-outline'}
                                size={18}
                                color={isSelected ? '#ea580c' : '#64748b'}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.pickerItemName,
                                  isSelected && styles.pickerItemNameSelected,
                                ]}
                              >
                                {item.name}
                              </Text>
                              {item.mergedFrom ? (
                                <Text style={styles.pickerItemSub}>
                                  Sáp nhập từ: {item.mergedFrom}
                                </Text>
                              ) : null}
                            </View>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={20} color="#ea580c" />
                            ) : null}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  ) : (
                    loadingManualWards ? (
                      <View style={styles.pickerLoadingWrap}>
                        <ActivityIndicator size="small" color="#f97316" />
                        <Text style={styles.pickerLoadingText}>Đang tải danh sách phường / xã...</Text>
                      </View>
                    ) : filteredManualWards.length === 0 ? (
                      <View style={styles.pickerEmptyWrap}>
                        <Ionicons name="search-outline" size={32} color="#cbd5e1" />
                        <Text style={styles.pickerEmptyText}>Không tìm thấy phường/xã nào</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={filteredManualWards}
                        keyExtractor={(item, idx) => `${item}-${idx}`}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.pickerListContent}
                        renderItem={({ item }) => {
                          const isSelected = item === manualWard;
                          return (
                            <TouchableOpacity
                              style={[
                                styles.pickerItemRow,
                                isSelected && styles.pickerItemRowSelected,
                              ]}
                              onPress={() => {
                                setManualWard(item);
                                setSubPickerMode(null);
                                setSubPickerSearch('');
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.pickerItemIconWrap}>
                                <Ionicons
                                  name="location-outline"
                                  size={18}
                                  color={isSelected ? '#ea580c' : '#64748b'}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.pickerItemName,
                                  isSelected && styles.pickerItemNameSelected,
                                  { flex: 1 },
                                ]}
                              >
                                {item}
                              </Text>
                              {isSelected ? (
                                <Ionicons name="checkmark-circle" size={20} color="#ea580c" />
                              ) : null}
                            </TouchableOpacity>
                          );
                        }}
                      />
                    )
                  )}
                </View>
              ) : (
                /* Main Form: 3 mục Tỉnh/TP + Phường/Xã + Số nhà tên đường */
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 14 }}
                >
                  {/* Title & Close */}
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons name="location-outline" size={22} color="#f97316" />
                      <View>
                        <Text style={styles.modalTitle}>Nhập địa chỉ thủ công</Text>
                        <Text style={styles.modalSubtitle}>Định dạng chuẩn hóa P. và TP.</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowManualModal(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={22} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Field 1: Chọn Tỉnh / Thành phố */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      TỈNH / THÀNH PHỐ <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerTriggerBtn}
                      onPress={() => {
                        setSubPickerSearch('');
                        setSubPickerMode('province');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="business-outline" size={18} color="#ea580c" />
                      <Text style={styles.pickerTriggerValue} numberOfLines={1}>
                        {manualProvince || 'Chọn Tỉnh / Thành phố...'}
                      </Text>
                      <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* Field 2: Chọn Phường / Xã */}
                  <View style={styles.formGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.formLabel}>
                        PHƯỜNG / XÃ (SAU SÁP NHẬP) <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      {loadingManualWards ? (
                        <ActivityIndicator size="small" color="#f97316" />
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.pickerTriggerBtn,
                        !manualProvince && styles.pickerTriggerBtnDisabled,
                      ]}
                      onPress={() => {
                        if (!manualProvince) {
                          Alert.alert('Chưa chọn Tỉnh / TP', 'Vui lòng chọn Tỉnh / Thành phố trước.');
                          return;
                        }
                        setSubPickerSearch('');
                        setSubPickerMode('ward');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate-circle-outline" size={18} color="#ea580c" />
                      <Text
                        style={[
                          styles.pickerTriggerValue,
                          !manualWard ? { color: '#94a3b8', fontWeight: '500' } : null,
                        ]}
                        numberOfLines={1}
                      >
                        {manualWard || (loadingManualWards ? 'Đang tải danh sách...' : 'Chọn Phường / Xã (P.)...')}
                      </Text>
                      <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* Field 3: Số nhà & Tên đường */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      SỐ NHÀ & TÊN ĐƯỜNG CỤ THỂ <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.modalInput, manualError && !manualStreet.trim() && styles.modalInputError]}
                      placeholder="VD: 123 Lê Lợi hoặc Số 45 Nguyễn Huệ..."
                      placeholderTextColor="#9ca3af"
                      value={manualStreet}
                      onChangeText={(t) => {
                        setManualStreet(t);
                        setManualError(false);
                      }}
                    />
                  </View>

                  {/* Address Preview Box */}
                  {/* <View style={styles.addressPreviewBox}>
                    <View style={styles.addressPreviewHeader}>
                      <Ionicons
                        name={manualWard && manualStreet.trim() ? 'checkmark-circle' : 'information-circle-outline'}
                        size={16}
                        color={manualWard && manualStreet.trim() ? '#16a34a' : '#ea580c'}
                      />
                      <Text style={styles.addressPreviewTitle}>ĐỊA CHỈ HOÀN CHỈNH SẼ LƯU:</Text>
                    </View>
                    <Text style={styles.addressPreviewText}>
                      {manualPreviewAddress || 'Vui lòng chọn Phường / Xã và gõ số nhà, tên đường'}
                    </Text>
                    <Text style={styles.addressStandardHint}>
                      ✅ Đảm bảo quy chuẩn đúng phường (<Text style={{ fontWeight: '700', color: '#ea580c' }}>P.</Text>) và thành phố (<Text style={{ fontWeight: '700', color: '#ea580c' }}>TP.</Text>)
                    </Text>
                  </View> */}

                  {/* Modal Action Buttons */}
                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setShowManualModal(false)}
                    >
                      <Text style={styles.modalCancelText}>Hủy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalSubmitBtn,
                        (!manualWard || !manualStreet.trim()) && styles.modalSubmitBtnDisabled,
                      ]}
                      onPress={handleConfirmManual}
                    >
                      <Ionicons name="checkmark-sharp" size={17} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.modalSubmitText}>Xác nhận địa chỉ</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topAccentBar: {
    height: 3,
    backgroundColor: '#f97316',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepTrack: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    backgroundColor: '#f97316',
  },
  stepTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1,
  },
  stepTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },

  /* Full-Screen Map */
  mapFullWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapTopOverlay: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  mapHintPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHintText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  togglePanelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingGpsFab: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.8,
  },

  /* Bottom Floating Sheet */
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 10,
  },

  /* Address Box */
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  coordSubText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  reselectBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reselectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },

  /* Actions Box */
  actionsBox: {
    gap: 8,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  btnActiveOrange: {
    backgroundColor: '#ea580c',
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  secondaryMethodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    gap: 6,
  },
  secondaryMethodBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  secondaryMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  secondaryMethodTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  confirmLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 12,
    paddingVertical: 9,
    gap: 6,
  },
  confirmLocationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: 0.8,
  },

  /* Footer CTA */
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.6,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalContentPicker: {
    height: 520,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  requiredStar: {
    color: '#ea580c',
  },
  pickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pickerTriggerBtnDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  pickerTriggerValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  modalInputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  addressPreviewBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  addressPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressPreviewTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9a3412',
    letterSpacing: 0.5,
  },
  addressPreviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 19,
  },
  addressStandardHint: {
    fontSize: 11,
    color: '#7c2d12',
    marginTop: 2,
    lineHeight: 16,
  },
  errorHintText: {
    fontSize: 11,
    color: '#dc2626',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalSubmitBtnDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Sub Picker */
  pickerViewContainer: {
    flex: 1,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickerHeaderSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  pickerCloseBtn: {
    padding: 6,
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  pickerListContent: {
    paddingVertical: 4,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  pickerItemRowSelected: {
    backgroundColor: '#fff7ed',
  },
  pickerItemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  pickerItemNameSelected: {
    color: '#ea580c',
    fontWeight: '800',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  pickerLoadingWrap: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  pickerLoadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  pickerEmptyWrap: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  pickerEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});
