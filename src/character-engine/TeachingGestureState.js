const smooth = value => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };

// Arm ownership/scheduling is independent of rig names and target geometry.
export class TeachingGestureState {
  constructor() {
    this.clock=0; this.welcomed=false; this.greetingStart=null; this.speaking=false; this.manual=false;
    this.restingSide=null; this.pocketWeights={left:0,right:0}; this.transition=null; this.nextSwitch=Infinity; this.switchIndex=0;
  }
  greet({force=false}={}) {
    if(this.greetingStart!==null || (this.welcomed&&!force))return false;
    this.welcomed=true; this.greetingStart=this.clock; return true;
  }
  setSpeaking(value) {
    value=Boolean(value); if(value===this.speaking)return;
    this.speaking=value;
    if(value&&!this.manual)this.setPocket('left',{automatic:true});
    if(!value&&!this.manual){this.restingSide=null;this.transition=null;this.nextSwitch=Infinity;}
  }
  setPocket(side,{automatic=false}={}) {
    if(!['left','right'].includes(side))return false;
    if(!automatic)this.manual=true;
    if(this.transition?.to===side || (!this.transition&&this.restingSide===side))return false;
    this.transition={start:this.clock,to:side,from:{...this.pocketWeights}}; return true;
  }
  switchHands() { return this.setPocket((this.transition?.to||this.restingSide)==='left'?'right':'left',{automatic:!this.manual}); }
  returnToIdle() {
    this.greetingStart=null;this.speaking=false;this.manual=false;this.transition=null;this.restingSide=null;this.nextSwitch=Infinity;
  }
  update(delta,{reducedMotion=false,busy=false}={}) {
    const dt=Math.max(0,Math.min(Number(delta)||0,.1));this.clock+=dt;
    if(this.greetingStart!==null&&this.clock-this.greetingStart>=2.9)this.greetingStart=null;
    if(reducedMotion&&!this.manual&&this.transition){
      this.restingSide=this.transition.to;this.pocketWeights.left=0;this.pocketWeights.right=0;this.pocketWeights[this.restingSide]=1;this.transition=null;this.nextSwitch=Infinity;
    }
    if(this.transition){
      const {start,to,from}=this.transition,age=this.clock-start;
      if(age<.75){const release=1-smooth(age/.75);for(const side of ['left','right'])this.pocketWeights[side]=from[side]*release;}
      else {this.pocketWeights.left=0;this.pocketWeights.right=0;if(age>1.2)this.pocketWeights[to]=smooth((age-1.2)/.9);}
      if(age>=2.1){this.restingSide=to;this.transition=null;this.nextSwitch=this.clock+13+(this.switchIndex%3)*3;}
    }else{
      const alpha=1-Math.exp(-6*dt);
      for(const side of ['left','right'])this.pocketWeights[side]+=((side===this.restingSide?1:0)-this.pocketWeights[side])*alpha;
      if(this.speaking&&!this.manual&&!reducedMotion&&!busy&&this.greetingStart===null&&this.clock>=this.nextSwitch){this.switchIndex++;this.switchHands();}
    }
    return this.getSnapshot();
  }
  getSnapshot() {
    const restingSide=this.transition?.to||this.restingSide;
    return {greetingElapsed:this.greetingStart===null?null:this.clock-this.greetingStart,restingSide,pocketWeights:{...this.pocketWeights},switching:Boolean(this.transition),
      phase:this.greetingStart!==null?'greeting':this.transition?'switching_hands':restingSide?`talking_${restingSide==='left'?'right':'left'}_hand`:'idle',
      freeSide:restingSide==='left'?'right':restingSide==='right'?'left':null,welcomed:this.welcomed};
  }
}
