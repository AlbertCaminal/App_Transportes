import React from 'react';
import { View, Text, Modal, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2, Maximize, Sparkles } from 'lucide-react-native';
import type { PackageSize } from '../../../shared/types';
import { theme } from '../../theme';

const WIN_H = Dimensions.get('window').height;

export interface ScanModalStyles {
  scanOverlay: object;
  scanCard: object;
  scanDim: object;
  scanFrame: object;
  scanLine: object;
  scanIconCenter: object;
  scanTop: object;
  scanTopTxt: object;
  scanBottom: object;
  scanResult: object;
  scanResultTxt: object;
  scanningTxt: object;
}

interface Props {
  visible: boolean;
  scanResult: { size: PackageSize; label: string } | null;
  styles: ScanModalStyles;
}

export function ClientScanModal({ visible, scanResult, styles: s }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.scanOverlay} accessibilityViewIsModal>
        <View style={[s.scanCard, { maxHeight: WIN_H * 0.65 }]} accessibilityLabel="Simulación de escaneo IA">
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?q=80&w=1000&auto=format&fit=crop',
            }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={s.scanDim} />
          <View style={s.scanFrame}>
            <View style={s.scanIconCenter}>
              <Maximize color="rgba(48,112,240,0.3)" size={56} />
            </View>
            <View style={s.scanLine} />
          </View>
          <View style={s.scanTop}>
            <Sparkles color={theme.electricBlue} size={16} />
            <Text style={s.scanTopTxt}> AI Vision Active</Text>
          </View>
          <View style={s.scanBottom}>
            {scanResult ? (
              <View style={s.scanResult}>
                <CheckCircle2 color="#fff" size={20} />
                <Text style={s.scanResultTxt}> {scanResult.label}</Text>
              </View>
            ) : (
              <Text style={s.scanningTxt}>Escaneando dimensiones con IA...</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
