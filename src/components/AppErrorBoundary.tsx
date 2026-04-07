import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error desconocido' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[AppErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Algo ha ido mal</Text>
            <Text style={styles.body}>
              La app ha encontrado un error inesperado. Puedes intentar continuar; si el problema persiste, reinicia la
              aplicación.
            </Text>
            {__DEV__ ? <Text style={styles.debug}>{this.state.message}</Text> : null}
            <Pressable
              onPress={this.handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            >
              <Text style={styles.btnTxt}>Reintentar</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bgRoot,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  debug: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: theme.gray600,
    marginBottom: 20,
  },
  btn: {
    alignSelf: 'center',
    backgroundColor: theme.electricBlue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  btnPressed: { opacity: 0.9 },
  btnTxt: { color: theme.white, fontSize: 15, fontWeight: '800' },
});
