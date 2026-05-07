import * as THREE from 'three';

/* ==========================================================================
   snake/skinDetails.js — Detalhes base (olhos + língua) para skins simples
   --------------------------------------------------------------------------
   Contém apenas a função default usada como fallback.
   Cada skin complexa tem o seu próprio ficheiro:
     • skinDragon.js   — Chinese Dragon
     • skinEgyptian.js — Cobra Egípcia / Faraó
     • skinViking.js   — Cobra Viking
     • skinMecha.js    — Samurai Mecha
     • skinInfernal.js — Serpente Infernal
   ========================================================================== */

/* ── Detalhes da cabeça default (olhos, língua) ── */
export function attachDefaultHeadDetails(headMesh, skin) {
  const eyeColor = skin ? skin.eyeColor : 0x00ffff;
  const tongueColor = skin ? skin.tongueColor : 0xff0066;

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.8,
    roughness: 0.2, metalness: 0.1,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0,
    roughness: 0.3, metalness: 0,
  });
  const tongueMat = new THREE.MeshStandardMaterial({
    color: tongueColor, emissive: tongueColor, emissiveIntensity: 0.5,
    roughness: 0.5, metalness: 0,
  });

  const eyeGeo = new THREE.SphereGeometry(0.09, 10, 8);
  const pupilGeo = new THREE.SphereGeometry(0.045, 8, 6);

  const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eyeL.position.set(-0.18, 0.12, -0.36);
  eyeR.position.set(0.18, 0.12, -0.36);

  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(0, 0, -0.07);
  pupilR.position.set(0, 0, -0.07);
  eyeL.add(pupilL);
  eyeR.add(pupilR);

  const tongueGeo = new THREE.BoxGeometry(0.05, 0.01, 0.28);
  const forkGeo = new THREE.BoxGeometry(0.02, 0.008, 0.1);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0, -0.04, -0.5);

  const forkL = new THREE.Mesh(forkGeo, tongueMat);
  const forkR = new THREE.Mesh(forkGeo, tongueMat);
  forkL.position.set(-0.018, 0, -0.16);
  forkR.position.set(0.018, 0, -0.16);
  forkL.rotation.y = -0.35;
  forkR.rotation.y = 0.35;
  tongue.add(forkL, forkR);

  headMesh.add(eyeL, eyeR, tongue);
  headMesh.userData.tongue = tongue;
}
