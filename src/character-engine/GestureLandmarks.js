import * as THREE from 'three';

// Head joints are pivots, not forehead contact points. Derive a reference from
// the actual head-weighted skin, then scale it with the live anatomical frame.
export function greetingHeadReference(rig, frame, armLength) {
  const headBone = rig.bones.Head || rig.bones.Neck;
  if (!headBone) return null;
  const head = frame.toBody(headBone.getWorldPosition(new THREE.Vector3()));
  if (!rig.gestureHeadBounds) {
    let top = head.y, front = head.z, samples = 0;
    rig.root.traverse(mesh => {
      const attrs = mesh.geometry?.attributes;
      if (!mesh.isSkinnedMesh || !attrs?.skinIndex || !attrs.skinWeight) return;
      mesh.skeleton.update();
      for (let i=0;i<attrs.position.count;i+=2) {
        let weight=0;
        for(let j=0;j<4;j++)if(mesh.skeleton.bones[attrs.skinIndex.getComponent(i,j)]===headBone)weight+=attrs.skinWeight.getComponent(i,j);
        if(weight<.7)continue;
        const p=frame.toBody(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
        top=Math.max(top,p.y);front=Math.max(front,p.z);samples++;
      }
    });
    rig.gestureHeadBounds={topRatio:(top-head.y)/frame.halfWidth,frontRatio:(front-head.z)/frame.halfWidth,samples};
  }
  const bounds=rig.gestureHeadBounds;
  if(!bounds.samples)return head.toArray();
  const foreheadY=head.y+bounds.topRatio*frame.halfWidth*.6;
  const frontZ=head.z+bounds.frontRatio*frame.halfWidth+frame.halfWidth*.04;
  // TeachingPoses adds these proportional wrist offsets to its supplied head
  // reference. Compensate so its unchanged trajectory lands at the real brow.
  return [head.x,foreheadY-armLength*.08,frontZ-frame.halfWidth*.7];
}
