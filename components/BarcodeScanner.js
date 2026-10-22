import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Scanner.module.css';

// A code must be out of view this long before the same code counts again,
// so holding the camera on one barcode registers it only once.
const SAME_CODE_GAP_MS = 2000;
const ELEMENT_ID = 'barcode-scanner-viewport';

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch (e) {
    // Audio feedback is optional.
  }
  if (navigator.vibrate) navigator.vibrate(80);
}

// Camera-based barcode / QR scanner. Calls onScan(code) for each new code read.
export default function BarcodeScanner({ onScan }) {
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ code: null, seenAt: 0 });
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState('idle'); // idle | starting | scanning
  const [error, setError] = useState('');

  onScanRef.current = onScan;

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, []);

  const handleDecoded = (text) => {
    const code = text.trim();
    const now = Date.now();
    const last = lastScanRef.current;
    const stillInView = code === last.code && now - last.seenAt < SAME_CODE_GAP_MS;
    lastScanRef.current = { code, seenAt: now };
    if (stillInView) return;
    beep();
    onScanRef.current(code);
  };

  const start = async () => {
    setError('');
    lastScanRef.current = { code: null, seenAt: 0 };
    if (!window.isSecureContext) {
      setError('The camera needs a secure (https://) connection. Open the app over HTTPS, or use manual entry below.');
      return;
    }
    setStatus('starting');
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import('html5-qrcode');
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [
            F.UPC_A, F.UPC_E, F.EAN_13, F.EAN_8, F.CODE_128, F.CODE_39,
            F.CODE_93, F.ITF, F.CODABAR, F.QR_CODE, F.DATA_MATRIX
          ],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        });
      }
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => ({
            width: Math.floor(width * 0.85),
            height: Math.floor(Math.min(height * 0.5, width * 0.5))
          })
        },
        handleDecoded,
        () => {} // per-frame "no code found" callbacks are expected; ignore them
      );
      setStatus('scanning');
    } catch (err) {
      setStatus('idle');
      const message = String(err && (err.message || err));
      setError(/permission|NotAllowed/i.test(message)
        ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
        : `Could not start the camera: ${message}`);
    }
  };

  const stop = async () => {
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      // clear() removes the library's video element and shaded scan-box overlay.
      await scanner.stop().then(() => scanner.clear()).catch(() => {});
    }
    setStatus('idle');
  };

  return (
    <div className={styles.scanner}>
      <div className={`${styles.viewport} ${status === 'scanning' ? styles.live : ''}`}>
        <div id={ELEMENT_ID} className={styles.video} />
        {status !== 'scanning' && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>📷</span>
            <span>{status === 'starting' ? 'Starting camera…' : 'Camera is off'}</span>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {status === 'scanning' ? (
        <button type="button" className={styles.stopBtn} onClick={stop}>
          ■ Stop Camera
        </button>
      ) : (
        <button
          type="button"
          className={styles.startBtn}
          onClick={start}
          disabled={status === 'starting'}
        >
          📷 Start Camera Scanner
        </button>
      )}
    </div>
  );
}
