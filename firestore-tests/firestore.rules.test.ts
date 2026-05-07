/**
 * Pruebas de reglas Firestore contra el emulador.
 * Ejecutar: npm run test:firestore-rules (incluye arranque del emulador vía firebase emulators:exec).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'demo-barcelona-rules';
const RULES_PATH = join(__dirname, '..', 'firestore.rules');
const { FieldValue } = firebase.firestore;

const googleAuth = { firebase: { sign_in_provider: 'google.com' } };

function baseExpressPayload(uid: string) {
  return {
    serviceType: 'express',
    status: 'pending',
    lang: 'es',
    origin: 'Carrer de Provença 1',
    expressDestination: 'Carrer de Mallorca 2',
    expressPackage: {
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30,
      weightKg: 8,
    },
    selectedDateOffset: 0,
    timeSlot: '08:00-10:00',
    openRoutePreferred: false,
    priceFull: '20.00',
    priceFinal: '18.40',
    hasSimulatedMatch: false,
    clientId: uid,
    createdAt: FieldValue.serverTimestamp(),
  };
}

function baseProgrammedPayload(uid: string) {
  return {
    serviceType: 'programmed',
    status: 'pending',
    lang: 'es',
    origin: 'Origen A',
    packages: [{ id: 'p1', destination: 'Dest B', lengthCm: 60, widthCm: 40, heightCm: 35, weightKg: 12 }],
    selectedDateOffset: 1,
    timeSlot: '10:00-12:00',
    openRoutePreferred: true,
    priceFull: '30.00',
    priceFinal: '28.00',
    hasSimulatedMatch: false,
    clientId: uid,
    createdAt: FieldValue.serverTimestamp(),
  };
}

describe('firestore.rules — requests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('permite crear express con usuario Google y campos permitidos', async () => {
    const uid = 'client-google-1';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertSucceeds(db.collection('requests').add(baseExpressPayload(uid)));
  });

  it('permite crear programmed con paquetes válidos', async () => {
    const uid = 'client-prog-1';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertSucceeds(db.collection('requests').add(baseProgrammedPayload(uid)));
  });

  it('rechaza anónimo', async () => {
    const uid = 'anon-uid';
    const db = testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    await assertFails(db.collection('requests').add(baseExpressPayload(uid)));
  });

  it('rechaza clientId distinto del uid autenticado', async () => {
    const db = testEnv.authenticatedContext('real-uid', googleAuth).firestore();
    await assertFails(
      db.collection('requests').add({
        ...baseExpressPayload('real-uid'),
        clientId: 'other-uid',
      })
    );
  });

  it('rechaza status distinto de pending', async () => {
    const uid = 'u1';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertFails(
      db.collection('requests').add({
        ...baseExpressPayload(uid),
        status: 'searching_carrier',
      })
    );
  });

  it('rechaza carrierId en creación', async () => {
    const uid = 'u2';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertFails(
      db.collection('requests').add({
        ...baseExpressPayload(uid),
        carrierId: 'some-carrier',
      })
    );
  });

  it('permite crear express con expressPackagePhotoUrl', async () => {
    const uid = 'client-photo-ex';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertSucceeds(
      db.collection('requests').add({
        ...baseExpressPayload(uid),
        expressPackagePhotoUrl: 'https://example.com/pkg.jpg',
      })
    );
  });

  it('permite programmed con packagePhotoUrl en un paquete', async () => {
    const uid = 'client-photo-prog';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertSucceeds(
      db.collection('requests').add({
        ...baseProgrammedPayload(uid),
        packages: [
          {
            id: 'p1',
            destination: 'Dest B',
            lengthCm: 60,
            widthCm: 40,
            heightCm: 35,
            weightKg: 12,
            packagePhotoUrl: 'https://example.com/stop.jpg',
          },
        ],
      })
    );
  });

  it('rechaza express con clave packages', async () => {
    const uid = 'u3';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertFails(
      db.collection('requests').add({
        ...baseExpressPayload(uid),
        packages: [],
      })
    );
  });

  it('rechaza programmed con paquete id vacío', async () => {
    const uid = 'u4';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertFails(
      db.collection('requests').add({
        ...baseProgrammedPayload(uid),
        packages: [
          {
            id: '',
            destination: 'X',
            lengthCm: 40,
            widthCm: 30,
            heightCm: 20,
            weightKg: 5,
          },
        ],
      })
    );
  });

  it('rechaza precio con formato inválido', async () => {
    const uid = 'u5';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    await assertFails(
      db.collection('requests').add({
        ...baseExpressPayload(uid),
        priceFinal: 'free',
      })
    );
  });

  it('transportista puede leer solicitud en searching_carrier', async () => {
    const clientUid = 'client-c1';
    const carrierUid = 'carrier-c1';

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await adb.collection('users').doc(carrierUid).set({ appMode: 'carrier' });
      await adb
        .collection('requests')
        .doc('req-open-1')
        .set({
          clientId: clientUid,
          status: 'searching_carrier',
          serviceType: 'express',
          lang: 'es',
          origin: 'A',
          expressDestination: 'B',
          expressPackage: {
            lengthCm: 50,
            widthCm: 40,
            heightCm: 30,
            weightKg: 8,
          },
          matchingStartedAt: new Date(),
        });
    });

    const carrierDb = testEnv.authenticatedContext(carrierUid, googleAuth).firestore();
    await assertSucceeds(carrierDb.collection('requests').doc('req-open-1').get());
  });

  it('cliente puede leer su propia solicitud', async () => {
    const uid = 'client-read-1';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    const ref = await db.collection('requests').add(baseExpressPayload(uid));
    await assertSucceeds(db.collection('requests').doc(ref.id).get());
  });

  it('rechaza update del cliente', async () => {
    const uid = 'client-up-1';
    const db = testEnv.authenticatedContext(uid, googleAuth).firestore();
    const ref = await db.collection('requests').add(baseExpressPayload(uid));
    await assertFails(
      ref.update({
        status: 'assigned',
        carrierId: 'x',
      })
    );
  });
});
